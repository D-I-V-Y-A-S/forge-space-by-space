import Resolver from '@forge/resolver';
import { runMigrationForSpaces, getSourceSpaces } from './migration';

const resolver = new Resolver();

resolver.define('getSpaces', async () => {
  const spaces = await getSourceSpaces();
  return spaces;
});

resolver.define('runMigration', async ({ payload }) => {
  const selectedSpaceKeys = payload?.payload?.selectedSpaces || [];
  console.log(selectedSpaceKeys)
  await runMigrationForSpaces(selectedSpaceKeys);
  return 'Migration done ✅';
});

export const handler = resolver.getDefinitions();
