import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SceneNode from './SceneNode';
import NodeOverlay from './NodeOverlay';
import { loadStoryData, saveScenes } from '../api';

const nodeTypes = { scene: SceneNode };

let nodeCount = 0;

function injectCallbacks(nodes, onExpand, onDeleteRequest) {
  return nodes.map((n) => ({ ...n, data: { ...n.data, onExpand, onDeleteRequest } }));
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

  const onExpand = useCallback((id) => setExpandedId(id), []);
  const onDeleteRequest = useCallback((id) => setDeleteTargetId(id), []);

  // Load saved scenes when storyId changes
  useEffect(() => {
    setLoaded(false);
    loadStoryData(storyId).then(({ scenes }) => {
      const savedNodes = scenes?.nodes ?? [];
      const savedEdges = scenes?.edges ?? [];
      // Fix nodeCount to avoid ID collisions with saved nodes
      const maxNum = Math.max(0, ...savedNodes.map((n) => parseInt(n.id.replace('node-', '')) || 0));
      nodeCount = Math.max(nodeCount, maxNum);
      setNodes(injectCallbacks(savedNodes, onExpand, onDeleteRequest));
      setEdges(savedEdges);
      setLoaded(true);
    });
  }, [storyId]); // eslint-disable-line

  // Debounced autosave — only after initial load
  const scheduleSave = useCallback((nds, eds) => {
    if (!loaded) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const serialized = {
        nodes: nds.map(({ id, type, position, style, data: { title, summary, notes } }) => ({
          id, type, position, style, data: { title, summary, notes },
        })),
        edges: eds.map(({ id, source, target, animated }) => ({ id, source, target, animated })),
      };
      saveScenes(storyIdRef.current, serialized).catch(() => {});
    }, 1200);
  }, [loaded]);

  // Re-inject callbacks when they change (stable, but belt-and-suspenders)
  useEffect(() => {
    if (!loaded) return;
    setNodes((nds) => injectCallbacks(nds, onExpand, onDeleteRequest));
  }, [onExpand, onDeleteRequest, loaded]); // eslint-disable-line

  // Wire addSceneRef
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
          data: { title, summary, notes, onExpand, onDeleteRequest },
        }];
        scheduleSave(next, edges);
        return next;
      });
    };
  }, [addSceneRef, onExpand, onDeleteRequest, scheduleSave, edges]);

  // Keep scenesRef current so App can read scene titles for context
  useEffect(() => {
    if (scenesRef) {
      scenesRef.current = nodes.map((n) => ({ title: n.data.title, summary: n.data.summary }));
    }
  }, [nodes, scenesRef]);

  // Wire editSceneRef
  useEffect(() => {
    if (!editSceneRef) return;
    editSceneRef.current = (sceneTitle, field, value) => {
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.data.title.toLowerCase() === sceneTitle.toLowerCase()
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

  const addNode = useCallback(() => {
    nodeCount += 1;
    const id = `node-${nodeCount}`;
    setNodes((nds) => {
      const next = [...nds, {
        id, type: 'scene',
        position: { x: 80 + (nodeCount % 4) * 260, y: 80 + Math.floor((nodeCount - 1) / 4) * 200 },
        style: { width: 220, height: 130 },
        data: { title: 'New Scene', summary: '', notes: '', onExpand, onDeleteRequest },
      }];
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, onExpand, onDeleteRequest, scheduleSave, edges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => {
      const next = addEdge({ ...params, animated: false }, eds);
      scheduleSave(nodes, next);
      return next;
    }),
    [setEdges, scheduleSave, nodes]
  );

  const handleChange = useCallback((nodeId, field, value) => {
    setNodes((nds) => {
      const next = nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n);
      scheduleSave(next, edges);
      return next;
    });
  }, [setNodes, scheduleSave, edges]);

  // Save on node drag/resize (position/size changes via onNodesChange)
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    // Debounce a save after React Flow updates state
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setNodes((nds) => {
        const serialized = {
          nodes: nds.map(({ id, type, position, style, data: { title, summary, notes } }) => ({
            id, type, position, style, data: { title, summary, notes },
          })),
          edges: edges.map(({ id, source, target, animated }) => ({ id, source, target, animated })),
        };
        saveScenes(storyIdRef.current, serialized).catch(() => {});
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
        panOnScroll
        panOnScrollSpeed={1.2}
        zoomOnScroll={false}
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={28} size={1} />
      </ReactFlow>

      <button className="add-node-btn" onClick={addNode} title="Add scene">+</button>

      <NodeOverlay
        node={expandedNode}
        onClose={() => setExpandedId(null)}
        onChange={handleChange}
      />

      {deleteTargetNode && (
        <div className="overlay-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="delete-confirm-title">Delete this scene?</p>
            <p className="delete-confirm-name">"{deleteTargetNode.data.title}"</p>
            <p className="delete-confirm-sub">This will also remove any connections to this scene.</p>
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
