import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';

export default function App() {
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const data = await invoke('getSpaces');
        setSpaces(data);
      } catch (err) {
        console.error('Failed to fetch spaces:', err);
      }
    };
    fetchSpaces();
  }, []);

  const toggleSpaceSelection = (spaceKey) => {
    setSelectedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceKey)) {
        newSet.delete(spaceKey);
      } else {
        newSet.add(spaceKey);
      }
      return newSet;
    });
  };

  const handleMigration = async () => {
    if (selectedSpaces.size === 0) {
      alert('Please select at least one space!');
      return;
    }

    setLoading(true);
    try {
      await invoke('runMigration', { payload: { selectedSpaces: Array.from(selectedSpaces) } });
      alert('Migration completed ✅');
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Migration failed ❌');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px 60px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ textAlign: 'center', fontSize: '28px', marginBottom: 10 }}>
        <strong>Confluence Migration Tool</strong> 
      </h1>

      {spaces.length === 0 ? (
        <p>Loading spaces...</p>
      ) : (
        <>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: 30,
            boxShadow: '0 0 10px rgba(0,0,0,0.05)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f5f7', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>S. No</th>
                <th style={{ padding: '14px 16px' }}>Spaces</th>
                <th style={{ padding: '14px 16px' }}>Migration</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space, index) => (
                <tr key={space.key} style={{ borderBottom: '1px solid #eaeaea' }}>
                  <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{space.name}</strong> ({space.key})
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedSpaces.has(space.key)}
                      onChange={() => toggleSpaceSelection(space.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button
              onClick={handleMigration}
              style={{
                padding: '12px 30px',
                fontSize: 16,
                backgroundColor: '#0052CC',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'background-color 0.2s ease'
              }}
              disabled={loading}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0747A6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
            >
              {loading ? 'Migrating...' : 'Migrate Selected Spaces'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
