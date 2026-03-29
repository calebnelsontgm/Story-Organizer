import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SceneNode from './SceneNode';
import TextNode from './TextNode';
import ShapeNode from './ShapeNode';
import ImageNode from './ImageNode';
import NodeOverlay from './NodeOverlay';
import { loadStoryData, saveScenes } from '../api';

const nodeTypes = {
  scene: SceneNode,
  text: TextNode,
  shape: ShapeNode,
  image: ImageNode,
};

let nodeCount = 0;

function serializeNodes(nds) {
  return nds.map((n) => {
    const base = {
      id: n.id,
      type: n.type,
      position: n.position,
      style: {
        width: n.measured?.width ?? n.style?.width,
        height: n.measured?.height ?? n.style?.height,
      },
    };
    if (n.type === 'scene')  return { ...base, data: { title: n.data.title, summary: n.data.summary, notes: n.data.notes, color: n.data.color } };
    if (n.type === 'text')   return { ...base, data: { text: n.data.text, color: n.data.color } };
    if (n.type === 'shape')  return { ...base, data: { shape: n.data.shape, fillColor: n.data.fillColor, strokeColor: n.data.strokeColor, label: n.data.label ?? '' } };
    if (n.type === 'image')  return { ...base, data: { url: n.data.url } };
    return { ...base, data: n.data };
  });
}

function serializeEdges(eds) {
  return eds.map(({ id, source, target, animated, type }) => ({ id, source, target, animated, ...(type ? { type } : {}) }));
}

function injectCallbacks(nodes, onChange, onDeleteRequest, onExpand) {
  return nodes.map((n) => {
    const base = { ...n, data: { ...n.data, onChange, onDeleteRequest } };
    return n.type === 'scene' ? { ...base, data: { ...base.data, onExpand } } : base;
  });
}

// Inner toolbar — lives inside ReactFlow tree so it can use useReactFlow
function CanvasToolbar({ onAddScene, onAddText, onAddShape, onPrepareImage, imageInputRef }) {
  const { screenToFlowPosition } = useReactFlow();

  const center = (w = 0, h = 0) => {
    const p = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    return { x: p.x - w / 2, y: p.y - h / 2 };
  };

  return (
    <Panel position="bottom-center" className="canvas-toolbar">
      <button className="canvas-toolbar-btn canvas-toolbar-scene" onClick={() => onAddScene(center(220, 130))}>
        ⊞ Scene
      </button>
      <div className="canvas-toolbar-sep" />
      <button className="canvas-toolbar-btn" onClick={() => onAddText(center(160, 60))}>
        T Text
      </button>
      <button className="canvas-toolbar-btn" onClick={() => onAddShape('rect', center(140, 140))}>
        ▭ Rect
      </button>
      <button className="canvas-toolbar-btn" onClick={() => onAddShape('ellipse', center(140, 140))}>
        ◯ Circle
      </button>
      <button className="canvas-toolbar-btn" onClick={() => { onPrepareImage(center(200, 160)); imageInputRef.current?.click(); }}>
        ⬛ Image
      </button>
    </Panel>
  );
}

export default function StoryTree({ storyId, addSceneRef, editSceneRef, scenesRef }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef(null);
  const storyIdRef = useRef(storyId);
  storyIdRef.current = storyId;

  const imageInputRef = useRef(null);
  const pendingImagePosRef = useRef({ x: 0, y: 0 });

  const onExpand = useCallback((id) => setExpandedId(id), []);
  const onDeleteRequest = useCallback((id) => setDeleteTargetId(id), []);

  const handleChangeRef = useRef(null);
  const stableOnChange = useCallback((...args) => handleChangeRef.current?.(...args), []);

  useEffect(() => {
    setLoaded(false);
    loadStoryData(storyId).then(({ scenes }) => {
      const savedNodes = scenes?.nodes ?? [];
      const savedEdges = scenes?.edges ?? [];
      const maxNum = Math.max(0, ...savedNodes.map((n) => parseInt(n.id.replace('node-', '')) || 0));
      nodeCount = Math.max(nodeCount, maxNum);
      setNodes(injectCallbacks(savedNodes, stableOnChange, onDeleteRequest, onExpand));
      setEdges(savedEdges);
      setLoaded(true);
    });
  }, [storyId]); // eslint-disable-line

  const scheduleSave = useCallback((nds, eds) => {
    if (!loaded) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveScenes(storyIdRef.current, {
        nodes: serializeNodes(nds),
        edges: serializeEdges(eds),
      }).catch(() => {});
    }, 1200);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    setNodes((nds) => injectCallbacks(nds, stableOnChange, onDeleteRequest, onExpand));
  }, [stableOnChange, onDeleteRequest, onExpand, loaded]); // eslint-disable-line

  const handleChange = useCallback((nodeId, field, value) => {
    setNodes((nds) => {
      const next = nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n);
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, scheduleSave, edges]);
  handleChangeRef.current = handleChange;

  // Wire addSceneRef (AI-driven — uses staggered fallback position)
  useEffect(() => {
    if (!addSceneRef) return;
    addSceneRef.current = (title, summary = '', notes = '') => {
      nodeCount += 1;
      const id = `node-${nodeCount}`;
      setNodes((nds) => {
        const next = [...nds, {
          id, type: 'scene',
          position: { x: 80 + (nodeCount % 4) * 260, y: 80 + Math.floor((nodeCount - 1) / 4) * 200 },
          style: { width: 220, height: 130 },
          data: { title, summary, notes, color: '#f97316', onChange: stableOnChange, onExpand, onDeleteRequest },
        }];
        scheduleSave(next, edges);
        return next;
      });
    };
  }, [addSceneRef, stableOnChange, onExpand, onDeleteRequest, scheduleSave, edges]);

  useEffect(() => {
    if (scenesRef) {
      scenesRef.current = nodes
        .filter((n) => n.type === 'scene')
        .map((n) => ({ title: n.data.title, summary: n.data.summary }));
    }
  }, [nodes, scenesRef]);

  useEffect(() => {
    if (!editSceneRef) return;
    editSceneRef.current = (sceneTitle, field, value) => {
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.type === 'scene' && n.data.title.toLowerCase() === sceneTitle.toLowerCase()
            ? { ...n, data: { ...n.data, [field]: value } }
            : n
        );
        scheduleSave(next, edges);
        return next;
      });
    };
  }, [editSceneRef, setNodes, scheduleSave, edges]);

  const confirmDelete = useCallback(() => {
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== deleteTargetId);
      setEdges((eds) => {
        const nextEdges = eds.filter((e) => e.source !== deleteTargetId && e.target !== deleteTargetId);
        scheduleSave(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setDeleteTargetId(null);
  }, [deleteTargetId, setNodes, setEdges, scheduleSave]);

  // ── Add handlers (accept position from toolbar) ───────────────

  const addNode = useCallback((position) => {
    nodeCount += 1;
    const id = `node-${nodeCount}`;
    setNodes((nds) => {
      const next = [...nds, {
        id, type: 'scene', position,
        style: { width: 220, height: 130 },
        data: { title: 'New Block', summary: '', notes: '', color: '#f97316', onChange: stableOnChange, onExpand, onDeleteRequest },
      }];
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, stableOnChange, onExpand, onDeleteRequest, scheduleSave, edges]);

  const addTextNode = useCallback((position) => {
    nodeCount += 1;
    const id = `node-${nodeCount}`;
    setNodes((nds) => {
      const next = [...nds, {
        id, type: 'text', position,
        style: { width: 160, height: 60 },
        data: { text: '', color: null, onChange: stableOnChange, onDeleteRequest },
      }];
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, stableOnChange, onDeleteRequest, scheduleSave, edges]);

  const addShapeNode = useCallback((shape, position) => {
    nodeCount += 1;
    const id = `node-${nodeCount}`;
    setNodes((nds) => {
      const next = [...nds, {
        id, type: 'shape', position,
        style: { width: 140, height: 140 },
        data: { shape, fillColor: 'var(--bg-raised)', strokeColor: 'var(--accent)', onChange: stableOnChange, onDeleteRequest },
      }];
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, stableOnChange, onDeleteRequest, scheduleSave, edges]);

  const handleImageFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const position = pendingImagePosRef.current;
    const reader = new FileReader();
    reader.onload = (ev) => {
      nodeCount += 1;
      const id = `node-${nodeCount}`;
      setNodes((nds) => {
        const next = [...nds, {
          id, type: 'image', position,
          style: { width: 200, height: 160 },
          data: { url: ev.target.result, onChange: stableOnChange, onDeleteRequest },
        }];
        scheduleSave(next, edges);
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [setNodes, stableOnChange, onDeleteRequest, scheduleSave, edges]);

  // ── Edges & drag ──────────────────────────────────────────────

  const onConnect = useCallback(
    (params) => setEdges((eds) => {
      const next = addEdge({ ...params, animated: false }, eds);
      scheduleSave(nodes, next);
      return next;
    }),
    [setEdges, scheduleSave, nodes]
  );

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    const hasMoved = changes.some((c) => c.type === 'position' || c.type === 'dimensions');
    if (!hasMoved) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setNodes((nds) => {
        saveScenes(storyIdRef.current, {
          nodes: serializeNodes(nds),
          edges: serializeEdges(edges),
        }).catch(() => {});
        return nds;
      });
    }, 1200);
  }, [onNodesChange, setNodes, edges]);

  const expandedNode = nodes.find((n) => n.id === expandedId) ?? null;
  const deleteTargetNode = nodes.find((n) => n.id === deleteTargetId) ?? null;

  return (
    <div className="story-tree-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView={nodes.length > 0}
        minZoom={0.1}
        maxZoom={2}
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={28} size={1} />
        <CanvasToolbar
          onAddScene={addNode}
          onAddText={addTextNode}
          onAddShape={addShapeNode}
          onPrepareImage={(pos) => { pendingImagePosRef.current = pos; }}
          imageInputRef={imageInputRef}
        />
      </ReactFlow>

      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />

      <NodeOverlay
        node={expandedNode}
        onClose={() => setExpandedId(null)}
        onChange={handleChange}
      />

      {deleteTargetNode && (
        <div className="overlay-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="delete-confirm-title">Delete this element?</p>
            <p className="delete-confirm-name">
              {deleteTargetNode.type === 'scene'
                ? `"${deleteTargetNode.data.title}"`
                : deleteTargetNode.type === 'text'
                ? 'Text block'
                : deleteTargetNode.type === 'shape'
                ? `${deleteTargetNode.data.shape === 'ellipse' ? 'Circle' : 'Rectangle'}`
                : 'Image'}
            </p>
            <p className="delete-confirm-sub">This will also remove any connections to this element.</p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setDeleteTargetId(null)}>Cancel</button>
              <button className="delete-confirm-ok" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
