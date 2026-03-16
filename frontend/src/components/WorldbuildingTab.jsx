import { useState } from 'react';

const CATEGORIES = [
  {
    id: 'factions',
    name: 'Factions & Groups',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="17" cy="19" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="31" cy="19" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M4 40c0-6.075 4.925-11 11-11h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M44 40c0-6.075-4.925-11-11-11h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'locations',
    name: 'Locations & Settings',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 6C17.925 6 13 10.925 13 17c0 9.5 11 23 11 23s11-13.5 11-23c0-6.075-4.925-11-11-11z" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="17" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'history',
    name: 'History',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="10" y="7" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M17 17h14M17 24h14M17 31h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'misc',
    name: 'Miscellaneous',
    icon: (
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="16" cy="16" r="4" fill="currentColor" />
        <circle cx="32" cy="16" r="4" fill="currentColor" />
        <circle cx="16" cy="32" r="4" fill="currentColor" />
        <circle cx="32" cy="32" r="4" fill="currentColor" />
      </svg>
    ),
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function makeEntry() {
  return { id: `entry-${makeId()}`, title: 'Untitled', body: '' };
}

export default function WorldbuildingTab({ entries, setEntries }) {
  const [catId, setCatId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const cat = CATEGORIES.find((c) => c.id === catId);
  const catEntries = catId ? entries[catId] : [];
  const selectedEntry = catEntries.find((e) => e.id === selectedEntryId) ?? null;

  const openCategory = (id) => {
    setCatId(id);
    setSelectedEntryId(null);
  };

  const addEntry = () => {
    const e = makeEntry();
    setEntries((prev) => ({ ...prev, [catId]: [...prev[catId], e] }));
    setSelectedEntryId(e.id);
  };

  const updateEntry = (id, changes) => {
    setEntries((prev) => ({
      ...prev,
      [catId]: prev[catId].map((e) => (e.id === id ? { ...e, ...changes } : e)),
    }));
  };

  // Landing — category grid
  if (!catId) {
    return (
      <div className="wb-landing">
        {CATEGORIES.map((c) => (
          <button key={c.id} className="wb-cat-card" onClick={() => openCategory(c.id)}>
            <div className="wb-cat-icon">{c.icon}</div>
            <div className="wb-cat-name">{c.name}</div>
            <div className="wb-cat-count">
              {entries[c.id].length} {entries[c.id].length === 1 ? 'entry' : 'entries'}
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Category detail view
  return (
    <div className="wb-view">
      <aside className="wb-sidebar">
        <div className="wb-sidebar-header">
          <button className="wb-back-btn" onClick={() => { setCatId(null); setSelectedEntryId(null); }}>
            ← Back
          </button>
          <span className="wb-sidebar-title">{cat.name}</span>
        </div>
        <div className="wb-sidebar-list">
          {catEntries.length === 0 && <p className="wb-empty">No entries yet.</p>}
          {catEntries.map((e) => (
            <button
              key={e.id}
              className={`wb-entry-item ${e.id === selectedEntryId ? 'active' : ''}`}
              onClick={() => setSelectedEntryId(e.id)}
            >
              {e.title || 'Untitled'}
            </button>
          ))}
        </div>
        <div className="wb-sidebar-footer">
          <button className="wb-add-btn" onClick={addEntry}>+ New Entry</button>
        </div>
      </aside>

      <main className="wb-main">
        {selectedEntry ? (
          <>
            <input
              className="wb-entry-title"
              value={selectedEntry.title}
              onChange={(e) => updateEntry(selectedEntry.id, { title: e.target.value })}
              placeholder="Entry title"
            />
            <textarea
              className="wb-entry-body"
              value={selectedEntry.body}
              onChange={(e) => updateEntry(selectedEntry.id, { body: e.target.value })}
              placeholder="Write freely…"
            />
          </>
        ) : (
          <div className="wb-placeholder">
            <p>{catEntries.length === 0 ? 'Create an entry to get started.' : 'Select an entry from the sidebar.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
