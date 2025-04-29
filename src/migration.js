import api, { route } from "@forge/api";
import path from "path";
import fs from "fs";
import { env } from "@forge/runtime";

const SOURCE_BASE_URL = 
const SOURCE_EMAIL = 
const SOURCE_API_TOKEN =
const AUTH_HEADER = {
  Authorization: `Basic ${Buffer.from(
    `${SOURCE_EMAIL}:${SOURCE_API_TOKEN}`
  ).toString("base64")}`,
};

const DEST_BASE_URL = 
const DEST_EMAIL = 
const DEST_API_TOKEN =
const AUTH_HEADER_1 = {
  Authorization: `Basic ${Buffer.from(
    `${DEST_EMAIL}:${DEST_API_TOKEN}`
  ).toString("base64")}`,
};

// Headers for Forge API calls (destination site)
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function getAllSpaces() {
  let spaces = [];
  let fetchMore = true;

  while (fetchMore) {
    try {
      console.log(
        "Starts fetching spaces...",
        `${SOURCE_BASE_URL}/wiki/rest/api/space?limit=1000`
      );
      const res = await fetch(
        `${SOURCE_BASE_URL}/wiki/rest/api/space?limit=1000`,
        {
          headers: {
            ...headers,
            ...AUTH_HEADER,
          },
        }
      );
      const json = await res.json();
      spaces = spaces.concat(json.results);
      fetchMore = json._links.next != null;
    } catch (error) {
      console.error("Error fetching spaces:", error);
      break;
    }
  }

  const filteredSpaces = spaces.filter((space) => space.type !== "personal");
  console.log("getAllSpaces result:", filteredSpaces);
  return filteredSpaces;
}

async function getAllDestSpaces() {
  let spaces = [];
  let fetchMore = true;

  while (fetchMore) {
    try {
      const res = await fetch(`${DEST_BASE_URL}/rest/api/space?limit=1000`, {
        headers: {
          ...headers,
          ...AUTH_HEADER_1,
        },
      });

      if (!res.ok) {
        throw new Error(`Unable to fetch spaces. Status Code: ${res.status}`);
      }

      const JsonResponse = await res.json();
      spaces = spaces.concat(JsonResponse.results);
      fetchMore = JsonResponse._links.next != null;
    } catch (error) {
      console.error("Error fetching destination spaces:", error);
      break;
    }
  }

  const result = new Set(spaces.map((space) => space.key));
  console.log("getAllDestSpaces result:", result);
  return result;
}

async function getSpaceDetails(spaceKey) {
  try {
    console.log("getspacedetails");
    const res = await fetch(
      `${SOURCE_BASE_URL}/wiki/rest/api/space/${spaceKey}`,
      { headers: { ...headers, ...AUTH_HEADER } }
    );
    const spaceDetails = await res.json();
    console.log("getSpaceDetails result:", spaceDetails);
    return spaceDetails;
  } catch (error) {
    console.error("Error fetching space details:", error.message);
    return null;
  }
}

async function createSpace(spaceKey, name, description) {
  const payload = {
    key: spaceKey,
    name: name,
    alias: "knowledgeiq",
    description: {
      plain: {
        value: description,
        representation: "plain",
      },
    },
  };
  console.log(payload);
  console.log(`${DEST_BASE_URL}`);
  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/space`, {
      method: "POST",
      headers: { ...headers, ...AUTH_HEADER_1 },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create space ${name}: ${errorText}`);
    }

    const space = await res.json();
    console.log(`✅ Created space: ${name} → Key: ${space.key}`);
    return space.key;
  } catch (error) {
    console.error(`❌ Error creating space ${name}:`, error.message);
    return null;
  }
}

async function getPages(spaceKey) {
  try {
    const url = `${SOURCE_BASE_URL}/wiki/rest/api/content?spaceKey=${spaceKey}&expand=body.storage,ancestors&limit=100`;
    const response = await fetch(url, {
      headers: { ...headers, ...AUTH_HEADER },
    });
    const data = await response.json();
    console.log(data);
    return data.results;
  } catch (error) {
    console.error("Error fetching pages:", error);
    return null;
  }
}

async function createPage(spaceKey, title, body, parentId = null) {
  const payload = {
    type: "page",
    title,
    space: { key: spaceKey },
    body: {
      storage: {
        value: body,
        representation: "storage",
      },
    },
  };

  if (parentId) {
    payload.ancestors = [{ id: parentId }];
  }

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/content`, {
        method: "POST",
        headers: { ...headers, ...AUTH_HEADER_1 },
        body: JSON.stringify(payload),
      });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Failed to create page "${title}":`, errorText);
      return null;
    }

    const pageId = (await res.json()).id;
    console.log(`✅ Created page: ${title} → ID: ${pageId}`);
    return pageId;
  } catch (error) {
    console.error(`🚨 Error creating page "${title}":`, error);
    return null;
  }
}

async function getAttachments(pageId) {
  try {
    const res = await fetch(
      `${SOURCE_BASE_URL}/wiki/rest/api/content/${pageId}/child/attachment`,
      { headers: { ...headers, ...AUTH_HEADER } }
    );
    const attachments = await res.json();
    return attachments.results || [];
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return [];
  }
}

async function downloadAttachment(attachmentId) {
  try {
    const res = await fetch(
      `${SOURCE_BASE_URL}/wiki/rest/api/content/${attachmentId}`,
      {
        headers: { ...headers, ...AUTH_HEADER},
      }
    );
    const json = await res.json();

    const downloadLink = json._links.download;

    // Step 2: Download the attachment
    const downloadRes = await fetch(
      `${SOURCE_BASE_URL}/wiki/${downloadLink}`,
      {
        headers: {
          Accept: "application/octet-stream",
          ...AUTH_HEADER,
        },
      }
    );

    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error("❌ Error downloading attachment:", error);
    return null;
  }
}

async function uploadAttachment(pageId, fileBytes, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([fileBytes]), filename);

  try {
    const res = await fetch(
      `${DEST_BASE_URL}/rest/api/content/${pageId}/child/attachment`,
      {
        method: "POST",
        body: formData,
        headers: { "X-Atlassian-Token": "no-check", ...AUTH_HEADER_1 },
      }
    );

    if (res.ok) {
      console.log(`📌 Uploaded attachment: ${filename}`);
    } else {
      throw new Error(
        `Failed to upload attachment ${filename}: ${res.statusText}`
      );
    }
  } catch (error) {
    console.error("Error uploading attachment:", error);
  }
}

async function getLabels(pageId) {
  const res = await fetch(
    `${SOURCE_BASE_URL}/wiki/rest/api/content/${pageId}/label`,
    {
      headers: { ...AUTH_HEADER, ...headers },
    }
  );
  const json = await res.json();
  return json.results.map((label) => label.name);
}

async function addLabelsToPage(pageId, labels) {
  const payload = labels.map((label) => ({ prefix: "global", name: label }));

  const res = await fetch(
    `${DEST_BASE_URL}/rest/api/content/${pageId}/label`,
    {
      method: "POST",
      headers: { ...headers, ...AUTH_HEADER_1 },
      body: JSON.stringify(payload),
    }
  );

  if (res.ok) {
    console.log(`✅ Labels added to page ID ${pageId}`);
  } else {
    console.error(`❌ Failed to add labels to page ID ${pageId}`);
  }
}

async function getComments(pageId) {
  try {
    const res = await fetch(
      `${SOURCE_BASE_URL}/wiki/rest/api/content/${pageId}/child/comment?expand=body.storage`,
      { headers: { ...headers, ...AUTH_HEADER } }
    );
    const comments = await res.json();
    return comments.results || [];
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

async function createComment(pageId, commentBody) {
  const payload = {
    type: "comment",
    body: {
      storage: {
        value: commentBody,
        representation: "storage",
      },
    },
    container: {
      id: `${pageId}`,
      type: "page",
    },
  };

  try {
    const res = await fetch(`${DEST_BASE_URL}/rest/api/content`, {
      method: "POST",
      headers: { ...headers, ...AUTH_HEADER_1 },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const comment = await res.json();
      console.log(`Created comment: ${comment.body.storage.value}`);
      return comment.id;
    } else {
      const errorText = await res.text();
      throw new Error(`Failed to create comment: ${errorText}`);
    }
  } catch (error) {
    console.error("Error creating comment:", error.message);
    return null;
  }
}

// Fetch source spaces (only key and name needed for frontend listing)
export async function getSourceSpaces() {
  const spaces = await getAllSpaces();
  return spaces.map((space) => ({
    key: space.key,
    name: space.name,
  }));
}

export async function runMigrationForSpaces(selectedSpaceKeys) {
  console.log(selectedSpaceKeys);

  if (!selectedSpaceKeys || !Array.isArray(selectedSpaceKeys)) {
    throw new Error(
      "Invalid input: selectedSpaceKeys must be a non-empty array."
    );
  }

  for (const spaceKey of selectedSpaceKeys) {
    const existingDestSpaceKeys = await getAllDestSpaces();
    console.log(existingDestSpaceKeys);

    if (existingDestSpaceKeys.has(spaceKey)) {
      console.log("Space already exists!");
    } else {
      const spaceDetails = await getSpaceDetails(spaceKey);
      const name = spaceDetails?.name || spaceKey;
      const description = spaceDetails?.description || "Migrated Space!";
      console.log(name, description);
      if (!existingDestSpaceKeys.has(spaceKey)) {
        await createSpace(spaceKey, name, description);
      }
    }
    
    const pages = await getPages(spaceKey);
    console.log(pages);
    const idMap = {};

    for (const page of pages) {
      if (!page || !page.id) continue;

      const { id: oldPageId, title, body, ancestors } = page;

      let parentId = null;
      if (ancestors && ancestors.length > 0) {
        const lastAncestorId = ancestors[ancestors.length - 1].id;
        parentId = idMap[lastAncestorId] || null;
      }

      const newPageId = await createPage(
        spaceKey,
        title,
        body.storage.value,
        parentId
      );
      if (!newPageId) continue;
      console.log(newPageId)

      idMap[oldPageId] = newPageId;

      const labels = await getLabels(oldPageId);
      if (labels.length > 0) {
        await addLabelsToPage(newPageId, labels);
      }

      const attachments = await getAttachments(oldPageId);
      for (const attachment of attachments) {
        const fileBytes = await downloadAttachment(attachment.id);
        await uploadAttachment(newPageId, fileBytes, attachment.title);
      }

      const comments = await getComments(oldPageId);
      for (const comment of comments) {
        await createComment(newPageId, comment.body.storage.value);
      }
    }
  }
}
