import { useRef } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

export default function ImageNode({ id, data, selected }) {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => data.onChange(id, 'url', ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="image-node">
      <NodeResizer
        minWidth={100}
        minHeight={80}
        isVisible={selected}
        lineStyle={{ borderColor: 'var(--accent)' }}
        handleStyle={{ background: 'var(--accent)', width: 8, height: 8 }}
      />
      <Handle type="target" position={Position.Top} />

      {data.url ? (
        <img src={data.url} className="image-node-img" alt="" />
      ) : (
        <div className="image-node-placeholder" onClick={() => fileRef.current?.click()}>
          <span className="image-node-plus">+</span>
          <span>Upload image</span>
        </div>
      )}

      {selected && data.url && (
        <button
          className="image-node-replace"
          onClick={() => fileRef.current?.click()}
          title="Replace image"
          onMouseDown={(e) => e.stopPropagation()}
        >
          Replace
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <button className="canvas-node-delete" onClick={() => data.onDeleteRequest(id)} title="Delete">✕</button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
