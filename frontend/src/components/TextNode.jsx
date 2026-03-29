import { NodeResizer } from '@xyflow/react';

const COLORS = ['#f97316','#ef4444','#a855f7','#3b82f6','#22c55e','#14b8a6','#ec4899','#6b7280'];

export default function TextNode({ id, data, selected, height }) {
  const h = height ?? 60;
  const fontSize = Math.max(10, h * 0.27);
  const paddingTop = Math.max(0, (h - fontSize * 1.3) / 2);

  return (
    <div className="text-node">
      <NodeResizer
        minWidth={60}
        minHeight={30}
        isVisible={selected}
        lineStyle={{ borderColor: 'var(--accent)' }}
        handleStyle={{ background: 'var(--accent)', width: 8, height: 8 }}
      />

      <textarea
        className="text-node-input"
        value={data.text ?? ''}
        onChange={(e) => data.onChange(id, 'text', e.target.value)}
        placeholder="Text…"
        style={{
          fontSize,
          paddingTop,
          color: data.color ?? 'var(--text-1)',
        }}
      />

      {selected && (
        <div className="canvas-swatches-panel" onMouseDown={(e) => e.stopPropagation()}>
          <button
            className={`canvas-swatch canvas-swatch-auto${!data.color ? ' active' : ''}`}
            onClick={() => data.onChange(id, 'color', null)}
            title="Auto (theme color)"
          />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`canvas-swatch${data.color === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => data.onChange(id, 'color', c)}
              title={c}
            />
          ))}
        </div>
      )}

      <button className="canvas-node-delete" onClick={() => data.onDeleteRequest(id)} title="Delete">✕</button>
    </div>
  );
}
