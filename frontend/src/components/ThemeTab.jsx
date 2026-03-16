import { useState } from 'react';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function makeTheme() {
  return { id: `theme-${makeId()}`, name: 'New Theme', body: '' };
}

export default function ThemeTab({ themes, setThemes }) {
  const [selectedId, setSelectedId] = useState(null);

  const addTheme = () => {
    const t = makeTheme();
    setThemes((prev) => [...prev, t]);
    setSelectedId(t.id);
  };

  const update = (id, changes) =>
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  const selected = themes.find((t) => t.id === selectedId) ?? null;

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
            </div>
          ))}
        </div>
        <div className="theme-sidebar-footer">
          <button className="theme-add-btn" onClick={addTheme}>+ New Theme</button>
        </div>
      </aside>

      <main className="theme-main">
        {selected ? (
          <textarea
            className="theme-body"
            value={selected.body}
            onChange={(e) => update(selected.id, { body: e.target.value })}
            placeholder="Write freely…"
          />
        ) : (
          <div className="theme-placeholder">
            <p>{themes.length === 0 ? 'Create a theme to get started.' : 'Select a theme from the sidebar.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
