import { useEffect, useState } from 'react';
import TiptapEditor from './TiptapEditor';

const EMPTY_CONTENT = (v) => !v || v === '<p></p>';

function exportToPdf(title, html) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title || 'Scene'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 680px;
      margin: 0 auto;
      padding: 60px 48px;
    }
    h1.doc-title {
      font-size: 22pt;
      font-weight: 700;
      margin-bottom: 32px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e5e5;
    }
    h1, h2, h3 { font-weight: 700; margin: 1.4em 0 0.5em; }
    h1 { font-size: 16pt; }
    h2 { font-size: 14pt; }
    h3 { font-size: 12pt; }
    p { margin: 0.7em 0; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    ul, ol { padding-left: 1.6em; margin: 0.7em 0; }
    li { margin: 0.3em 0; }
    blockquote {
      border-left: 3px solid #ccc;
      padding-left: 1em;
      margin: 1em 0;
      color: #555;
      font-style: italic;
    }
    code { font-family: monospace; background: #f3f3f3; padding: 1px 4px; border-radius: 3px; }
    pre { background: #f3f3f3; padding: 12px; border-radius: 4px; overflow-x: auto; }
    @media print {
      body { padding: 0; }
      h1.doc-title { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  ${title ? `<h1 class="doc-title">${title}</h1>` : ''}
  ${html}
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}

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

        <div className="overlay-label-row">
          <label className="overlay-label">Content</label>
          {contentMode === 'editor' && !EMPTY_CONTENT(node.data.notes) && (
            <button
              className="overlay-export-btn"
              onClick={() => exportToPdf(node.data.title, node.data.notes)}
              title="Export to PDF"
            >
              ↓ Export PDF
            </button>
          )}
        </div>

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
