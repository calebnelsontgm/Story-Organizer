import { Handle, Position } from '@xyflow/react';

export default function AnchorNode({ id, data, selected }) {
  return (
    <div className={`anchor-node${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
      <button
        className="anchor-node-delete"
        onClick={() => data.onDeleteRequest(id)}
        title="Delete"
      >✕</button>
    </div>
  );
}
