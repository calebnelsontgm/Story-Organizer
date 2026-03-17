import { useState, useCallback, useRef, useEffect } from 'react';
import StoryTree from './components/StoryTree';
import CharactersTab from './components/CharactersTab';
import ThemeTab from './components/ThemeTab';
import WorldbuildingTab from './components/WorldbuildingTab';
import StoryBoard from './components/StoryBoard';
import { listStories, createStory, updateMeta, loadStoryData,
  saveCharacters, saveThemes, saveWorldbuilding, saveCover } from './api';
import CoverTab from './components/CoverTab';
import AiPanel from './components/AiPanel';
import './App.css';

// ── Theme ─────────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(true);
  const toggle = useCallback(() => {
    setDark((d) => {
      document.documentElement.setAttribute('data-theme', d ? 'light' : 'dark');
      return !d;
    });
  }, []);
  return [dark, toggle];
}

// ── Autosave hook ─────────────────────────────────────────────────────────────
// Fires saveFn(value) after `delay` ms whenever value changes.
// Skips the first render after storyId changes (the load event).

function useAutosave(storyId, value, saveFn, delay = 900) {
  const timerRef = useRef(null);
  const prevStoryIdRef = useRef(storyId);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    // When storyId changes, value is being set from a load — skip saving
    if (prevStoryIdRef.current !== storyId) {
      prevStoryIdRef.current = storyId;
      return;
    }
    if (!storyId) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveFnRef.current(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, storyId, delay]);
}

// ── Unique ID generator ───────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, toggleTheme] = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);

  // Board
  const [stories, setStories] = useState([]);
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);

  // Editor
  const [activeTab, setActiveTab] = useState('cover');
  const [storyName, setStoryName] = useState('');
  const [characters, setCharacters] = useState([]);
  const [themes, setThemes] = useState([]);
  const [wbEntries, setWbEntries] = useState({ factions: [], locations: [], history: [], misc: [] });
  const [cover, setCover] = useState({ font: 'Playfair Display', synopsis: '', imageUrl: '' });

  const addSceneRef = useRef(null);
  const editSceneRef = useRef(null);
  const scenesRef = useRef([]); // kept current by StoryTree

  // ── Load stories on mount ────────────────────────────────────────────────

  useEffect(() => {
    listStories()
      .then((s) => setStories(s))
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  // ── Autosave ──────────────────────────────────────────────────────────────

  useAutosave(activeStoryId, characters, (v) => activeStoryId && saveCharacters(activeStoryId, v));
  useAutosave(activeStoryId, themes,     (v) => activeStoryId && saveThemes(activeStoryId, v));
  useAutosave(activeStoryId, wbEntries,  (v) => activeStoryId && saveWorldbuilding(activeStoryId, v));
  useAutosave(activeStoryId, cover,      (v) => activeStoryId && saveCover(activeStoryId, v));

  // ── Board navigation ──────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    const id = makeId();
    const name = 'Untitled Story';
    const createdAt = Date.now();
    const meta = await createStory(id, name, createdAt);
    setStories((prev) => [meta, ...prev]);
    setCharacters([]);
    setThemes([]);
    setWbEntries({ factions: [], locations: [], history: [], misc: [] });
    setCover({ font: 'Playfair Display', synopsis: '', imageUrl: '' });
    setStoryName(name);
    setActiveTab('cover');
    setActiveStoryId(id);
  }, []);

  const handleOpen = useCallback(async (id) => {
    const meta = stories.find((s) => s.id === id);
    setStoryName(meta?.name ?? '');
    setActiveTab('tree');
    setActiveStoryId(id);
    const data = await loadStoryData(id);
    setCharacters(data.characters ?? []);
    setThemes(data.themes ?? []);
    setWbEntries(data.worldbuilding ?? { factions: [], locations: [], history: [], misc: [] });
    setCover(data.cover ?? { font: 'Playfair Display', synopsis: '', imageUrl: '' });
  }, [stories]);

  const handleBackToBoard = useCallback(() => {
    setActiveStoryId(null);
  }, []);

  const handleRenameStory = useCallback((name) => {
    setStoryName(name);
    setStories((prev) => prev.map((s) => (s.id === activeStoryId ? { ...s, name } : s)));
    if (activeStoryId) updateMeta(activeStoryId, { name }).catch(() => {});
  }, [activeStoryId]);

  // ── AI panel tool handlers ────────────────────────────────────────────────

  const handleAiAddScene = useCallback((title, summary, notes) => {
    addSceneRef.current?.(title, summary, notes);
  }, []);

  const handleAiAddCharacter = useCallback((name, description) => {
    setCharacters((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, {
        id: `char-${makeId()}`,
        name, image: '', overview: description ?? '',
        coreUrge: '', originOfUrge: '', statedBelief: '',
        lifeAreas: { goals: '', relationships: '', lifestyle: '', presentation: '', dialogue: '' },
        arcOutcome: null, atFirst: '', reinforces: '', laterOn: '', challenges: '', arcOutcomes: '',
        arcChanges: { goals: '', relationships: '', lifestyle: '', presentation: '', dialogue: '' },
        perspectives: { worldView: '', selfView: '', othersView: '', coreFear: '', coreDesire: '', misconception: '', conflictStyle: '', desiredPerception: '' },
        mood: '', hobbies: '', skills: '', habits: '', tastes: '', weaknesses: '',
      }];
    });
  }, []);

  const handleAiAddTheme = useCallback((name, body = '') => {
    setThemes((prev) => [...prev, { id: `theme-${makeId()}`, name, body }]);
  }, []);

  const handleAiAddWorldbuilding = useCallback((category, title, body = '') => {
    const catKey = category.toLowerCase();
    const validKeys = ['factions', 'locations', 'history', 'misc'];
    const key = validKeys.find((k) => catKey.includes(k)) ?? 'misc';
    setWbEntries((prev) => ({
      ...prev,
      [key]: [...prev[key], { id: `wb-${makeId()}`, title, body }],
    }));
  }, []);

  const handleAiEditCharacter = useCallback((charName, field, value) => {
    setCharacters((prev) => prev.map((c) => {
      if (c.name.toLowerCase() !== charName.toLowerCase()) return c;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...c, [parent]: { ...c[parent], [child]: value } };
      }
      return { ...c, [field]: value };
    }));
  }, []);

  const handleAiEditScene = useCallback((sceneTitle, field, value) => {
    editSceneRef.current?.(sceneTitle, field, value);
  }, []);

  const handleAiEditTheme = useCallback((themeName, body) => {
    setThemes((prev) => prev.map((t) =>
      t.name.toLowerCase() === themeName.toLowerCase() ? { ...t, body } : t
    ));
  }, []);

  const handleAiEditWorldbuilding = useCallback((category, entryTitle, body) => {
    const catKey = category.toLowerCase();
    const validKeys = ['factions', 'locations', 'history', 'misc'];
    const key = validKeys.find((k) => catKey.includes(k)) ?? 'misc';
    setWbEntries((prev) => ({
      ...prev,
      [key]: prev[key].map((e) =>
        e.title.toLowerCase() === entryTitle.toLowerCase() ? { ...e, body } : e
      ),
    }));
  }, []);

  // Build story context string for the AI — called fresh before each send
  const getStoryContext = useCallback(() => {
    if (!activeStoryId) return '';
    const parts = [`Story: "${storyName}"`];
    if (characters.length > 0)
      parts.push(`Characters: ${characters.map((c) => c.name).join(', ')}`);
    const scenes = scenesRef.current ?? [];
    if (scenes.length > 0)
      parts.push(`Scenes: ${scenes.map((s) => `"${s.title}"`).join(', ')}`);
    if (themes.length > 0)
      parts.push(`Themes: ${themes.map((t) => t.name).join(', ')}`);
    const wb = [];
    if (wbEntries.factions.length > 0) wb.push(`Factions: ${wbEntries.factions.map((e) => e.title).join(', ')}`);
    if (wbEntries.locations.length > 0) wb.push(`Locations: ${wbEntries.locations.map((e) => e.title).join(', ')}`);
    if (wbEntries.history.length > 0) wb.push(`History: ${wbEntries.history.map((e) => e.title).join(', ')}`);
    if (wbEntries.misc.length > 0) wb.push(`Misc: ${wbEntries.misc.map((e) => e.title).join(', ')}`);
    if (wb.length > 0) parts.push(`Worldbuilding — ${wb.join(' | ')}`);
    return parts.join('\n');
  }, [activeStoryId, storyName, characters, themes, wbEntries]);

  // ── Board view ────────────────────────────────────────────────────────────

  if (!activeStoryId) {
    return (
      <div className="app">
        <header className="app-header">
          <div style={{ flex: 1 }} />
          <div className="header-right">
            <button className="theme-toggle" onClick={toggleTheme}>{dark ? '☀ Light' : '☾ Dark'}</button>
          </div>
        </header>
        <StoryBoard stories={stories} loading={boardLoading} onCreate={handleCreate} onOpen={handleOpen} />
      </div>
    );
  }

  // ── Editor view ───────────────────────────────────────────────────────────

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="sb-back-btn" onClick={handleBackToBoard} title="Back to stories">←</button>
          <input className="story-name-input" value={storyName} onChange={(e) => handleRenameStory(e.target.value)} placeholder="Story name" />
        </div>
        <nav className="tab-bar">
          <button className={`tab-btn ${activeTab === 'cover' ? 'active' : ''}`} onClick={() => setActiveTab('cover')}>Cover</button>
          <button className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`} onClick={() => setActiveTab('tree')}>Story Tree</button>
          <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>Characters</button>
          <button className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>Themes</button>
          <button className={`tab-btn ${activeTab === 'worldbuilding' ? 'active' : ''}`} onClick={() => setActiveTab('worldbuilding')}>Worldbuilding</button>
        </nav>
        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>{dark ? '☀ Light' : '☾ Dark'}</button>
          <button className={`panel-toggle${panelOpen ? ' active' : ''}`} onClick={() => setPanelOpen((v) => !v)} title="AI Assistant">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {activeTab === 'cover' ? (
        <CoverTab
          storyId={activeStoryId}
          storyName={storyName}
          onRename={handleRenameStory}
          cover={cover}
          onCoverChange={setCover}
        />
      ) : activeTab === 'tree' ? (
        <StoryTree storyId={activeStoryId} addSceneRef={addSceneRef} editSceneRef={editSceneRef} scenesRef={scenesRef} />
      ) : activeTab === 'characters' ? (
        <CharactersTab characters={characters} setCharacters={setCharacters} storyId={activeStoryId} />
      ) : activeTab === 'themes' ? (
        <ThemeTab themes={themes} setThemes={setThemes} />
      ) : activeTab === 'worldbuilding' ? (
        <WorldbuildingTab entries={wbEntries} setEntries={setWbEntries} />
      ) : null}

      <AiPanel
        open={panelOpen}
        getStoryContext={getStoryContext}
        onAddScene={handleAiAddScene}
        onAddCharacter={handleAiAddCharacter}
        onAddTheme={handleAiAddTheme}
        onAddWorldbuilding={handleAiAddWorldbuilding}
        onEditCharacter={handleAiEditCharacter}
        onEditScene={handleAiEditScene}
        onEditTheme={handleAiEditTheme}
        onEditWorldbuilding={handleAiEditWorldbuilding}
      />
    </div>
  );
}
