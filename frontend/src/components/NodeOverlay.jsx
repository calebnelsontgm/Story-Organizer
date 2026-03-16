import { useEffect } from 'react';

export default function NodeOverlay({ node, onClose, onChange }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!node) return null;

  return (
    <div className="overlay-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="overlay-panel">
        <button className="overlay-close" onClick={onClose}>✕</button>

        <input
          className="overlay-title"
          value={node.data.title}
          onChange={(e) => onChange(node.id, 'title', e.target.value)}
          placeholder="Scene title"
        />

        <label className="overlay-label">Summary</label>
        <textarea
          className="overlay-summary"
          value={node.data.summary || ''}
          onChange={(e) => onChange(node.id, 'summary', e.target.value)}
          placeholder="One or two sentences describing what happens in this scene…"
        />

        <label className="overlay-label">Notes</label>
        <textarea
          className="overlay-notes"
          value={node.data.notes || ''}
          onChange={(e) => onChange(node.id, 'notes', e.target.value)}
          placeholder="Anything else — details, research, dialogue snippets, questions to resolve…"
        />
      </div>
    </div>
  );
}
