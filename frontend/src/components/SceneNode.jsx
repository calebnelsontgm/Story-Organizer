import { Handle, Position, NodeResizer } from '@xyflow/react';

export default function SceneNode({ id, data, selected }) {
  return (
    <div className="scene-node">
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: 'var(--accent)' }}
        handleStyle={{ background: 'var(--accent)', width: 8, height: 8 }}
      />

      <Handle type="target" position={Position.Top} />

      <div className="scene-node-header">
        <span className="scene-node-title">{data.title || 'Untitled'}</span>
        <button className="scene-node-expand-btn" onClick={() => data.onExpand(id)} title="Expand">⤢</button>
        <button className="scene-node-delete-btn" onClick={() => data.onDeleteRequest(id)} title="Delete">✕</button>
      </div>

      <div className="scene-node-body">
        {data.summary ? (
          <p className="scene-node-summary">{data.summary}</p>
        ) : (
          <p className="scene-node-summary scene-node-placeholder">No summary yet…</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
