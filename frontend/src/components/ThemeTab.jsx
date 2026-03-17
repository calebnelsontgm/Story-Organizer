import { useState } from 'react';
import TiptapEditor from './TiptapEditor';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function makeTheme() {
  return { id: `theme-${makeId()}`, name: 'New Theme', body: '' };
}

export default function ThemeTab({ themes, setThemes }) {
  const [selectedId, setSelectedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const addTheme = () => {
    const t = makeTheme();
    setThemes((prev) => [...prev, t]);
    setSelectedId(t.id);
  };

  const update = (id, changes) =>
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  const confirmDelete = () => {
    if (selectedId === deleteId) setSelectedId(null);
    setThemes((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
  };

  const selected = themes.find((t) => t.id === selectedId) ?? null;
  const deleteTarget = themes.find((t) => t.id === deleteId) ?? null;

  return (
    <div className="theme-tab">
      <aside className="theme-sidebar">
        <div className="theme-sidebar-list">
          {themes.length === 0 && <p className="theme-empty">No themes yet.</p>}
          {themes.map((t) => (
            <div
              key={t.id}
              className={`theme-sidebar-item ${t.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(t.id)}
            >
              {t.id === selectedId ? (
                <input
                  className="theme-name-input"
                  value={t.name}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{t.name || 'Untitled'}</span>
              )}
              <button
                className="sidebar-item-delete"
                title="Delete theme"
                onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
              >✕</button>
            </div>
          ))}
        </div>
        <div className="theme-sidebar-footer">
          <button className="theme-add-btn" onClick={addTheme}>+ New Theme</button>
        </div>
      </aside>

      <main className="theme-main">
        {selected ? (
          <TiptapEditor
            contentId={selected.id}
            content={selected.body}
            onChange={(html) => update(selected.id, { body: html })}
          />
        ) : (
          <div className="theme-placeholder">
            <p>{themes.length === 0 ? 'Create a theme to get started.' : 'Select a theme from the sidebar.'}</p>
          </div>
        )}
      </main>

      {deleteTarget && (
        <div className="overlay-backdrop" onClick={() => setDeleteId(null)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="delete-confirm-title">Delete this theme?</p>
            <p className="delete-confirm-name">"{deleteTarget.name || 'Untitled'}"</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="delete-confirm-ok" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
