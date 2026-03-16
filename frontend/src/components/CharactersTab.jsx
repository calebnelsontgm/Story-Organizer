import { useState } from 'react';
import CharacterProfile from './CharacterProfile';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeChar() {
  return {
    id: `char-${makeId()}`,
    name: 'New Character',
    image: '',
    overview: '',
    coreUrge: '',
    originOfUrge: '',
    statedBelief: '',
    lifeAreas: { goals: '', relationships: '', lifestyle: '', presentation: '', dialogue: '' },
    arcOutcome: null,
    atFirst: '',
    reinforces: '',
    laterOn: '',
    challenges: '',
    arcOutcomes: '',
    arcChanges: { goals: '', relationships: '', lifestyle: '', presentation: '', dialogue: '' },
    perspectives: {
      worldView: '',
      selfView: '',
      othersView: '',
      coreFear: '',
      coreDesire: '',
      misconception: '',
      conflictStyle: '',
      desiredPerception: '',
    },
    mood: '',
    hobbies: '',
    skills: '',
    habits: '',
    tastes: '',
    weaknesses: '',
  };
}

export default function CharactersTab({ characters, setCharacters, storyId }) {
  const [selectedId, setSelectedId] = useState(null);

  const addCharacter = () => {
    const char = makeChar();
    setCharacters((prev) => [...prev, char]);
    setSelectedId(char.id);
  };

  const updateCharacter = (id, updater) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const selectedChar = characters.find((c) => c.id === selectedId) ?? null;

  if (selectedChar) {
    return (
      <CharacterProfile
        character={selectedChar}
        onChange={(updater) => updateCharacter(selectedChar.id, updater)}
        onBack={() => setSelectedId(null)}
        storyId={storyId}
      />
    );
  }

  return (
    <div className="char-landing">
      {characters.length === 0 && (
        <p className="char-empty">No characters yet — click + to add one.</p>
      )}
      <div className="char-grid">
        {characters.map((c) => (
          <button key={c.id} className="char-card" onClick={() => setSelectedId(c.id)}>
            <div className="char-card-img">
              {c.image
                ? <img src={c.image} alt={c.name} className="char-img-fill" />
                : <svg viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="18" r="9" fill="currentColor" opacity="0.35" />
                    <path d="M4 46c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" strokeWidth="2.5" opacity="0.35" />
                  </svg>
              }
            </div>
            <span className="char-card-name">{c.name || 'Untitled'}</span>
          </button>
        ))}
      </div>
      <button className="char-add-btn" onClick={addCharacter} title="Add character">+</button>
    </div>
  );
}
