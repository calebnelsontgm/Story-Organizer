import { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessage } from '../api';

function makeId() {
  return Math.random().toString(36).slice(2);
}

export default function AiPanel({
  open,
  getStoryContext,
  onAddScene, onAddCharacter, onAddTheme, onAddWorldbuilding,
  onEditCharacter, onEditScene, onEditTheme, onEditWorldbuilding,
}) {
  const [msgs, setMsgs] = useState([]);
  const [convMsgs, setConvMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clarification, setClarification] = useState(null);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const getStoryContextRef = useRef(getStoryContext);
  getStoryContextRef.current = getStoryContext;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const addMsg = (type, text) =>
    setMsgs((prev) => [...prev, { id: makeId(), type, text }]);

  const applyToolCall = useCallback((name, input) => {
    if (name === 'create_scene') {
      addMsg('thought', `Creating scene: "${input.title}"`);
      onAddScene?.(input.title, input.summary ?? '', input.notes ?? '');
    } else if (name === 'add_character') {
      addMsg('thought', `Adding character: ${input.name}`);
      onAddCharacter?.(input.name, input.description ?? '');
    } else if (name === 'add_worldbuilding') {
      addMsg('thought', `Worldbuilding [${input.category}]: "${input.content}"`);
      onAddWorldbuilding?.(input.category, input.content, '');
    } else if (name === 'place_in_act') {
      addMsg('thought', `Act ${input.act_number}: "${input.content}"`);
    } else if (name === 'edit_character') {
      addMsg('thought', `Editing ${input.character_name} → ${input.field}`);
      onEditCharacter?.(input.character_name, input.field, input.value);
    } else if (name === 'edit_scene') {
      addMsg('thought', `Editing scene "${input.scene_title}" → ${input.field}`);
      onEditScene?.(input.scene_title, input.field, input.value);
    } else if (name === 'edit_theme') {
      addMsg('thought', `Editing theme "${input.theme_name}"`);
      onEditTheme?.(input.theme_name, input.body);
    } else if (name === 'edit_worldbuilding') {
      addMsg('thought', `Editing worldbuilding "${input.entry_title}"`);
      onEditWorldbuilding?.(input.category, input.entry_title, input.body);
    } else if (name === 'enter_clarification_mode') {
      addMsg('thought', `Needs clarification: "${input.question}"`);
    } else {
      addMsg('thought', `Tool: ${name}`);
    }
  }, [onAddScene, onAddCharacter, onAddWorldbuilding, onEditCharacter, onEditScene, onEditTheme, onEditWorldbuilding]);

  const processResponse = useCallback(
    async (response, currentConv) => {
      const { content, stop_reason } = response;

      content.filter((b) => b.type === 'text').forEach((b) => {
        if (b.text.trim()) addMsg('speech', b.text.trim());
      });

      if (stop_reason !== 'tool_use') {
        return [...currentConv, { role: 'assistant', content }];
      }

      const toolUseBlocks = content.filter((b) => b.type === 'tool_use');
      let clarificationBlock = null;
      const toolResults = [];

      for (const block of toolUseBlocks) {
        applyToolCall(block.name, block.input);
        if (block.name === 'enter_clarification_mode') {
          clarificationBlock = block;
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: '__PENDING__' });
        } else {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'ok' });
        }
      }

      const nextConv = [
        ...currentConv,
        { role: 'assistant', content },
        { role: 'user', content: toolResults },
      ];

      if (clarificationBlock) {
        setClarification({
          question: clarificationBlock.input.question,
          options: clarificationBlock.input.options,
          pendingConv: nextConv,
        });
        return nextConv;
      }

      const ctx = getStoryContextRef.current?.();
      const nextResponse = await sendMessage(nextConv, ctx);
      return processResponse(nextResponse, nextConv);
    },
    [applyToolCall]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    addMsg('user', text);

    const next = [...convMsgs, { role: 'user', content: text }];
    const ctx = getStoryContextRef.current?.();
    try {
      const response = await sendMessage(next, ctx);
      const finalConv = await processResponse(response, next);
      setConvMsgs(finalConv);
    } catch (err) {
      addMsg('thought', `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, convMsgs, processResponse]);

  const handleClarificationAnswer = useCallback(async (answer) => {
    if (!clarification) return;
    addMsg('user', answer);

    const patched = clarification.pendingConv.map((turn) => {
      if (turn.role !== 'user' || !Array.isArray(turn.content)) return turn;
      return {
        ...turn,
        content: turn.content.map((c) =>
          c.type === 'tool_result' && c.content === '__PENDING__'
            ? { ...c, content: `User selected: "${answer}". Now proceed.` }
            : c
        ),
      };
    });

    setClarification(null);
    setLoading(true);
    const ctx = getStoryContextRef.current?.();
    try {
      const response = await sendMessage(patched, ctx);
      const finalConv = await processResponse(response, patched);
      setConvMsgs(finalConv);
    } catch (err) {
      addMsg('thought', `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [clarification, processResponse]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`aip-panel${open ? ' open' : ''}`}>
      <div className="aip-header">
        <span className="aip-title">AI Assistant</span>
        {loading && <span className="aip-loading">thinking…</span>}
      </div>

      <div className="aip-messages">
        {msgs.length === 0 && (
          <div className="aip-empty">Ask me anything about your story.</div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`aip-msg aip-msg--${m.type}`}>
            {m.type === 'thought' && <span className="aip-thought-arrow">→</span>}
            <span className="aip-msg-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {clarification && (
        <div className="aip-clarification">
          <p className="aip-clarification-q">{clarification.question}</p>
          <div className="aip-clarification-opts">
            {(clarification.options ?? []).map((opt) => (
              <button
                key={opt}
                className="aip-clarification-btn"
                onClick={() => handleClarificationAnswer(opt)}
                disabled={loading}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="aip-input-area">
        <textarea
          className="aip-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={2}
          disabled={loading || !!clarification}
        />
        <button
          className="aip-send-btn"
          onClick={handleSend}
          disabled={loading || !!clarification || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
