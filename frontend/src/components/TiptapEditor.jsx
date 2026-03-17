import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── FontSize extension ────────────────────────────────────────────────────────

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ── SearchReplace extension ───────────────────────────────────────────────────

const searchKey = new PluginKey('search');

function findMatches(doc, term) {
  if (!term) return [];
  const matches = [];
  const lower = term.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text.toLowerCase();
    let i = text.indexOf(lower);
    while (i !== -1) {
      matches.push({ from: pos + i, to: pos + i + term.length });
      i = text.indexOf(lower, i + 1);
    }
  });
  return matches;
}

const SearchReplace = Extension.create({
  name: 'searchReplace',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: searchKey,
      state: {
        init: () => ({ term: '', matches: [], idx: 0 }),
        apply(tr, prev) {
          const meta = tr.getMeta(searchKey);
          if (meta != null) return meta;
          if (tr.docChanged) {
            const matches = findMatches(tr.doc, prev.term);
            return { term: prev.term, matches, idx: Math.min(prev.idx, Math.max(0, matches.length - 1)) };
          }
          return prev;
        },
      },
      props: {
        decorations(state) {
          const { term, matches, idx } = searchKey.getState(state);
          if (!term || !matches.length) return DecorationSet.empty;
          return DecorationSet.create(state.doc, matches.map((m, i) =>
            Decoration.inline(m.from, m.to, { class: i === idx ? 'search-current' : 'search-match' })
          ));
        },
      },
    })];
  },
});

// ── Constants ─────────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  '#ffffff', '#cbd5e1', '#94a3b8', '#475569',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];
const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#f5d0fe',
  '#fecaca', '#fed7aa', '#e0e7ff', 'none',
];
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

// ── BubbleColorPicker ─────────────────────────────────────────────────────────

function BubbleColorPicker({ colors, onSelect, currentColor, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="bubble-color-wrap" ref={ref}>
      <button
        className={`bubble-btn${open ? ' active' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); setOpen(v => !v); }}
        title={label === 'A' ? 'Text color' : 'Highlight'}
      >
        <span style={{ borderBottom: `3px solid ${currentColor || (label === 'H' ? 'transparent' : '#fff')}` }}>
          {label}
        </span>
      </button>
      {open && (
        <div className="bubble-color-popover">
          {colors.map((c) => (
            <button
              key={c}
              className="bubble-swatch"
              style={c === 'none'
                ? { background: 'transparent', border: '1px dashed #64748b' }
                : { background: c }
              }
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
              title={c === 'none' ? 'Remove' : c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── FindReplacePanel ──────────────────────────────────────────────────────────

function FindReplacePanel({ editor }) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');

  const updateSearch = useCallback((term) => {
    if (!editor) return;
    const matches = findMatches(editor.state.doc, term);
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { term, matches, idx: 0 }));
  }, [editor]);

  const navigate = useCallback((dir) => {
    if (!editor) return;
    const state = searchKey.getState(editor.state);
    if (!state.matches.length) return;
    const idx = (state.idx + dir + state.matches.length) % state.matches.length;
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { ...state, idx }));
    editor.commands.setTextSelection(state.matches[idx]);
  }, [editor]);

  const doReplace = useCallback(() => {
    if (!editor) return;
    const state = searchKey.getState(editor.state);
    const match = state.matches[state.idx];
    if (!match) return;
    const { tr } = editor.state;
    tr.replaceWith(match.from, match.to, replace ? editor.state.schema.text(replace) : editor.state.schema.text(''));
    editor.view.dispatch(tr);
    updateSearch(find);
  }, [editor, replace, find, updateSearch]);

  const doReplaceAll = useCallback(() => {
    if (!editor || !find) return;
    const matches = findMatches(editor.state.doc, find);
    const { tr } = editor.state;
    [...matches].reverse().forEach(({ from, to }) => {
      if (replace) tr.replaceWith(from, to, editor.state.schema.text(replace));
      else tr.delete(from, to);
    });
    editor.view.dispatch(tr);
    updateSearch(find);
  }, [editor, find, replace, updateSearch]);

  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.view.dispatch(editor.state.tr.setMeta(searchKey, { term: '', matches: [], idx: 0 }));
      }
    };
  }, [editor]);

  const searchState = editor ? searchKey.getState(editor.state) : null;
  const matchCount = searchState?.matches?.length ?? 0;
  const currentIdx = searchState?.idx ?? 0;

  return (
    <div className="tt-find-panel">
      <div className="tt-find-row">
        <input
          className="tt-find-input"
          placeholder="Find…"
          value={find}
          autoFocus
          onChange={e => { setFind(e.target.value); updateSearch(e.target.value); }}
        />
        <span className="tt-find-count">
          {find ? (matchCount > 0 ? `${currentIdx + 1} / ${matchCount}` : 'No results') : ''}
        </span>
        <button className="tt-find-nav" onClick={() => navigate(-1)} title="Previous">↑</button>
        <button className="tt-find-nav" onClick={() => navigate(1)} title="Next">↓</button>
      </div>
      <div className="tt-find-row">
        <input
          className="tt-find-input"
          placeholder="Replace…"
          value={replace}
          onChange={e => setReplace(e.target.value)}
        />
        <button className="tt-find-action" onClick={doReplace}>Replace</button>
        <button className="tt-find-action" onClick={doReplaceAll}>All</button>
      </div>
    </div>
  );
}

// ── TiptapEditor ──────────────────────────────────────────────────────────────

export default function TiptapEditor({ contentId, content, onChange }) {
  const [zoom, setZoom] = useState(1);
  const [showFind, setShowFind] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pageRef = useRef(null);
  const [pageHeight, setPageHeight] = useState(600);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      SearchReplace,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
  });

  // Reset when switching to a different content item
  const prevId = useRef(contentId);
  useEffect(() => {
    if (!editor) return;
    if (prevId.current !== contentId) {
      prevId.current = contentId;
      editor.commands.setContent(content || '', false);
    }
  }, [contentId, editor, content]);

  // Measure page height for zoom layout
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const ro = new ResizeObserver(() => setPageHeight(page.offsetHeight));
    ro.observe(page);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (pageRef.current) setPageHeight(pageRef.current.offsetHeight);
  }, [zoom]);

  const headingLevel = editor ? ([1,2,3].find(l => editor.isActive('heading', { level: l })) ?? 0) : 0;
  const currentFontSize = editor?.getAttributes('textStyle').fontSize ?? '16px';

  return (
    <div className="tiptap-wrap">
      {showFind && <FindReplacePanel editor={editor} />}

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 0, placement: 'top-start' }}
          className="bubble-menu"
        >
          {/* Row 1: text formatting, headings, font size, colors, link */}
          <div className="bubble-row">
            <button className={`bubble-btn${editor.isActive('bold') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="Bold"><b>B</b></button>
            <button className={`bubble-btn${editor.isActive('italic') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="Italic"><i>I</i></button>
            <button className={`bubble-btn${editor.isActive('underline') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Underline"><u>U</u></button>
            <button className={`bubble-btn${editor.isActive('strike') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} title="Strike"><s>S</s></button>
            <div className="bubble-sep" />
            <button className={`bubble-btn${editor.isActive('heading', { level: 1 }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} title="H1">H1</button>
            <button className={`bubble-btn${editor.isActive('heading', { level: 2 }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} title="H2">H2</button>
            <button className={`bubble-btn${editor.isActive('heading', { level: 3 }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} title="H3">H3</button>
            <div className="bubble-sep" />
            <select
              className="bubble-select"
              value={currentFontSize}
              onMouseDown={e => e.stopPropagation()}
              onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
            >
              {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
            </select>
            <div className="bubble-sep" />
            <BubbleColorPicker
              label="A"
              colors={TEXT_COLORS}
              currentColor={editor.getAttributes('textStyle').color}
              onSelect={c => editor.chain().focus().setColor(c).run()}
            />
            <BubbleColorPicker
              label="H"
              colors={HIGHLIGHT_COLORS}
              currentColor={editor.getAttributes('highlight').color}
              onSelect={c => c === 'none'
                ? editor.chain().focus().unsetHighlight().run()
                : editor.chain().focus().setHighlight({ color: c }).run()
              }
            />
            <div className="bubble-sep" />
            <button
              className={`bubble-btn${editor.isActive('link') ? ' active' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
                const url = window.prompt('Enter URL:');
                if (url) editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
              }}
              title="Link"
            >🔗</button>
          </div>

          {/* Row 2: alignment, lists, blockquote */}
          <div className="bubble-row">
            <button className={`bubble-btn${editor.isActive({ textAlign: 'left' }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} title="Left">⇤</button>
            <button className={`bubble-btn${editor.isActive({ textAlign: 'center' }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} title="Center">↔</button>
            <button className={`bubble-btn${editor.isActive({ textAlign: 'right' }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} title="Right">⇥</button>
            <button className={`bubble-btn${editor.isActive({ textAlign: 'justify' }) ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }} title="Justify">≡</button>
            <div className="bubble-sep" />
            <button className={`bubble-btn${editor.isActive('bulletList') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} title="Bullet list">• ≡</button>
            <button className={`bubble-btn${editor.isActive('orderedList') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Numbered list">1. ≡</button>
            <div className="bubble-sep" />
            <button className={`bubble-btn${editor.isActive('blockquote') ? ' active' : ''}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }} title="Blockquote">"</button>
            <button className="bubble-btn" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }} title="Horizontal rule">—</button>
          </div>
        </BubbleMenu>
      )}

      <div className="tiptap-canvas">
        {/* Corner controls */}
        <div className="tiptap-corner">
          <button
            className={`corner-btn${showFind ? ' active' : ''}`}
            onClick={() => setShowFind(v => !v)}
            title="Find & Replace"
          >⌕</button>
          <div className="corner-zoom">
            <button className="corner-btn" onClick={() => setZoom(z => +(Math.max(0.5, z - 0.1).toFixed(1)))}>−</button>
            <span className="corner-zoom-pct">{Math.round(zoom * 100)}%</span>
            <button className="corner-btn" onClick={() => setZoom(z => +(Math.min(2, z + 0.1).toFixed(1)))}>+</button>
          </div>
        </div>

        <div style={{ height: `${pageHeight * zoom + 64}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div
            ref={pageRef}
            className="tiptap-page"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <EditorContent editor={editor} className="tiptap-content" />
          </div>
        </div>
      </div>
    </div>
  );
}
