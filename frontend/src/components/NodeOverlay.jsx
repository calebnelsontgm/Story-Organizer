import { useEffect, useState } from 'react';
import TiptapEditor from './TiptapEditor';

const EMPTY_CONTENT = (v) => !v || v === '<p></p>';

export default function NodeOverlay({ node, onClose, onChange }) {
  const [contentMode, setContentMode] = useState(null); // null | 'editor'

  // When the node changes, decide whether to show the choice screen or go straight to the editor
  useEffect(() => {
    if (!node) return;
    setContentMode(EMPTY_CONTENT(node.data.notes) ? null : 'editor');
  }, [node?.id]); // eslint-disable-line

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

        <div className="overlay-title-row">
          <input
            className="overlay-title"
            value={node.data.title}
            onChange={(e) => onChange(node.id, 'title', e.target.value)}
            placeholder="Block title"
          />
          <div className="overlay-color-swatches">
            {['#f97316','#ef4444','#a855f7','#3b82f6','#22c55e','#14b8a6','#ec4899','#6b7280'].map((color) => (
              <button
                key={color}
                className={`color-swatch${(node.data.color ?? '#f97316') === color ? ' active' : ''}`}
                style={{ background: color }}
                onClick={() => onChange(node.id, 'color', color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <label className="overlay-label">Summary</label>
        <textarea
          className="overlay-summary"
          value={node.data.summary || ''}
          onChange={(e) => onChange(node.id, 'summary', e.target.value)}
          placeholder="One or two sentences describing what happens in this block…"
        />

        <label className="overlay-label">Content</label>

        {contentMode === 'editor' ? (
          <TiptapEditor
            contentId={node.id}
            content={node.data.notes || ''}
            onChange={(html) => onChange(node.id, 'notes', html)}
          />
        ) : (
          <div className="content-choice">
            <button
              className="content-choice-btn"
              onClick={() => setContentMode('editor')}
            >
              <span className="content-choice-icon">✦</span>
              <span className="content-choice-label">Create new</span>
            </button>
            <button className="content-choice-btn" disabled title="Coming soon">
              <span className="content-choice-icon">↑</span>
              <span className="content-choice-label">Upload existing file</span>
              <span className="content-choice-soon">soon</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
