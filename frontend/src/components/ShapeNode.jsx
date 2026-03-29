import { Handle, Position, NodeResizer } from '@xyflow/react';

const COLORS = ['#f97316','#ef4444','#a855f7','#3b82f6','#22c55e','#14b8a6','#ec4899','#6b7280'];

export default function ShapeNode({ id, data, selected }) {
  const { shape = 'rect', fillColor = 'var(--bg-raised)', strokeColor = 'var(--accent)' } = data;

  return (
    <div
      className="shape-node"
      style={{
        background: fillColor,
        border: `2px solid ${strokeColor}`,
        borderRadius: shape === 'ellipse' ? '50%' : '8px',
      }}
    >
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={selected}
        lineStyle={{ borderColor: strokeColor }}
        handleStyle={{ background: strokeColor === 'var(--accent)' ? '#f97316' : strokeColor, width: 8, height: 8 }}
      />
      <Handle type="target" position={Position.Top} />

      {selected && (
        <div className="canvas-swatches-panel shape-swatches" onMouseDown={(e) => e.stopPropagation()}>
          <span className="canvas-swatch-label">Fill</span>
          <button
            className={`canvas-swatch canvas-swatch-auto${fillColor === 'var(--bg-raised)' ? ' active' : ''}`}
            onClick={() => data.onChange(id, 'fillColor', 'var(--bg-raised)')}
            title="Theme default"
          />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`canvas-swatch${fillColor === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => data.onChange(id, 'fillColor', c)}
              title={c}
            />
          ))}
          <span className="canvas-swatch-label" style={{ marginLeft: 6 }}>Edge</span>
          <button
            className={`canvas-swatch canvas-swatch-auto${strokeColor === 'var(--accent)' ? ' active' : ''}`}
            onClick={() => data.onChange(id, 'strokeColor', 'var(--accent)')}
            title="Theme accent"
          />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`canvas-swatch${strokeColor === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => data.onChange(id, 'strokeColor', c)}
              title={c}
            />
          ))}
        </div>
      )}

      <input
        className="shape-node-label"
        value={data.label ?? ''}
        onChange={(e) => data.onChange(id, 'label', e.target.value)}
      />

      <button className="canvas-node-delete" onClick={() => data.onDeleteRequest(id)} title="Delete">✕</button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
