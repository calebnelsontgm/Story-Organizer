import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { uploadImage } from '../api';

const PAGES = ['Overview', 'Character Map', 'Character Arc', 'More'];

/* ── Expandable textarea ──
   Renders the overlay via a portal so CSS transforms on ancestors don't clip it. */
function ExpandableTextarea({ className, wrapClass = '', label, value, onChange, rows = 2, placeholder = '…' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`cp-tx-wrap ${wrapClass}`}>
        <textarea
          className={className}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button className="cp-expand-btn" onClick={() => setOpen(true)} title="Expand">⤢</button>
      </div>

      {open && createPortal(
        <div className="cp-expand-backdrop" onClick={() => setOpen(false)}>
          <div className="cp-expand-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cp-expand-header">
              {label && <span className="cp-expand-label">{label}</span>}
              <button className="cp-expand-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <textarea
              className="cp-expand-ta"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── Reusable labeled field ── */
function Field({ label, hint, value, onChange, rows = 2 }) {
  return (
    <div className="cp-field">
      <label className="cp-field-label">{label}</label>
      {hint && <p className="cp-field-hint">{hint}</p>}
      <ExpandableTextarea className="cp-field-input" label={label} value={value} onChange={onChange} rows={rows} />
    </div>
  );
}

/* ── Page 0: Overview ── */
function OverviewPage({ char, set, storyId }) {
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      if (storyId) {
        try {
          const { url } = await uploadImage(storyId, char.id, dataUrl);
          set('image', url);
        } catch {
          // Fallback to data URL if upload fails
          set('image', dataUrl);
        }
      } else {
        set('image', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="cp-overview">
      <div className="cp-overview-left">
        <input
          className="cp-overview-name"
          value={char.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Character name"
        />
        <div className="cp-overview-img" onClick={() => fileRef.current?.click()} title="Click to upload image">
          {char.image
            ? <img src={char.image} alt={char.name} className="char-img-fill" />
            : <svg viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.25" />
                <path d="M6 74c0-18.778 15.222-34 34-34s34 15.222 34 34" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              </svg>
          }
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
        </div>
      </div>
      <ExpandableTextarea
        className="cp-overview-text"
        wrapClass="cp-overview-tx-wrap"
        label="Overview"
        value={char.overview}
        onChange={(v) => set('overview', v)}
        placeholder="Overview — a brief sense of who this character is…"
        rows={4}
      />
    </div>
  );
}

/* ── Page 1: Character Map ── */
const LIFE_AREAS = ['goals', 'relationships', 'lifestyle', 'presentation', 'dialogue'];
const LIFE_AREA_LABELS = ['Goals', 'Relationships', 'Lifestyle', 'Presentation', 'Dialogue'];

function CharacterMapPage({ char, set, setLA }) {
  return (
    <div className="cp-page-content">
      <div className="cp-map-top">
        <div className="cp-map-col">
          <label className="cp-field-label">Origin of Urge</label>
          <p className="cp-field-hint">When did the character learn to behave in this way? How did it help them? <em>Not necessary to know.</em></p>
          <ExpandableTextarea
            className="cp-field-input cp-map-textarea"
            label="Origin of Urge"
            value={char.originOfUrge}
            onChange={(v) => set('originOfUrge', v)}
            rows={5}
          />
        </div>
        <div className="cp-map-col">
          <label className="cp-field-label">Core Urge</label>
          <p className="cp-field-hint">A compulsion. <em>"In order to survive / get my needs met, I must…"</em> A general solution to a specific problem.</p>
          <ExpandableTextarea
            className="cp-field-input cp-map-textarea"
            label="Core Urge"
            value={char.coreUrge}
            onChange={(v) => set('coreUrge', v)}
            rows={5}
          />
        </div>
      </div>

      <div className="cp-map-divider">
        <span className="cp-map-divider-label">subconscious</span>
        <div className="cp-map-divider-line" />
        <span className="cp-map-divider-label">conscious</span>
      </div>

      <div className="cp-field">
        <label className="cp-field-label">Stated Belief / Lie</label>
        <p className="cp-field-hint">Unhealthy people usually aren't conscious of the fact that their urges are coping mechanisms, so they create a narrative to justify the core urge.</p>
        <ExpandableTextarea
          className="cp-field-input"
          label="Stated Belief / Lie"
          value={char.statedBelief}
          onChange={(v) => set('statedBelief', v)}
          rows={3}
        />
      </div>

      <div className="cp-section-label">The Core Urge Affects All Areas of Their Life</div>
      <div className="cp-life-areas">
        {LIFE_AREAS.map((area, i) => (
          <Field key={area} label={LIFE_AREA_LABELS[i]} value={char.lifeAreas[area]} onChange={(v) => setLA(area, v)} rows={3} />
        ))}
      </div>
    </div>
  );
}

/* ── Page 2: Character Arc ── */
function CharacterArcPage({ char, set, setNested }) {
  const sc = (k) => (v) => setNested('arcChanges', k, v);
  return (
    <div className="cp-page-content cp-two-col">
      <Field label="At first, what reinforces the core urge?" value={char.atFirst} onChange={(v) => set('atFirst', v)} rows={3} />
      <Field label="Later on… what challenges it?" value={char.laterOn} onChange={(v) => set('laterOn', v)} rows={3} />

      <div className="cp-field cp-full">
        <label className="cp-field-label">Do they overcome their core urge?</label>
        <div className="cp-arc-btns">
          {[['yes', 'Yes'], ['no', 'No'], ['worse', "It's even worse now"]].map(([val, label]) => (
            <button
              key={val}
              className={`cp-arc-btn ${char.arcOutcome === val ? 'active' : ''}`}
              onClick={() => set('arcOutcome', char.arcOutcome === val ? null : val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="cp-field cp-full">
        <label className="cp-field-label">Outcomes</label>
        <p className="cp-field-hint">How does their change or refusal to change affect the greater story and other characters?</p>
        <ExpandableTextarea
          className="cp-field-input"
          label="Outcomes"
          value={char.arcOutcomes}
          onChange={(v) => set('arcOutcomes', v)}
          rows={3}
        />
      </div>

      <div className="cp-section-label cp-full">If applicable, what changes about their…</div>
      <Field label="Goals" value={char.arcChanges.goals} onChange={sc('goals')} rows={2} />
      <Field label="Relationships" value={char.arcChanges.relationships} onChange={sc('relationships')} rows={2} />
      <Field label="Lifestyle" value={char.arcChanges.lifestyle} onChange={sc('lifestyle')} rows={2} />
      <Field label="Presentation" value={char.arcChanges.presentation} onChange={sc('presentation')} rows={2} />
      <Field label="Dialogue" value={char.arcChanges.dialogue} onChange={sc('dialogue')} rows={2} />
    </div>
  );
}

/* ── Page 3: More ── */
function MorePage({ char, set }) {
  const fields = [
    ['mood', 'Mood / Temperament', null],
    ['hobbies', 'Hobbies', null],
    ['skills', 'Skills', null],
    ['habits', 'Habits / Addictions', null],
    ['tastes', 'Tastes / Preferences', null],
    ['weaknesses', 'Weaknesses', 'How could someone trick or manipulate this character?'],
  ];
  return (
    <div className="cp-page-content cp-two-col">
      <p className="cp-page-intro cp-full">These can reflect the core urge but don't have to.</p>
      {fields.map(([key, label, hint]) => (
        <Field key={key} label={label} hint={hint} value={char[key]} onChange={(v) => set(key, v)} rows={2} />
      ))}
    </div>
  );
}

/* ── Main profile component ── */
export default function CharacterProfile({ character, onChange, onBack, storyId }) {
  const [page, setPage] = useState(0);

  const set = (field, value) => onChange((c) => ({ ...c, [field]: value }));
  const setNested = (field, key, value) =>
    onChange((c) => ({ ...c, [field]: { ...c[field], [key]: value } }));
  const setLA = (area, value) =>
    onChange((c) => ({ ...c, lifeAreas: { ...c.lifeAreas, [area]: value } }));

  return (
    <div className="char-profile">
      <div className="char-profile-topbar">
        <button className="char-back-btn" onClick={onBack}>← Characters</button>
        <span className="char-profile-name-display">{character.name || 'Untitled'}</span>
        <div style={{ width: 100 }} />
      </div>

      <div className="char-pages-area">
        <button className="char-page-arrow" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">‹</button>

        <div className="char-pages-viewport">
          <div className="char-page-label">{PAGES[page]}</div>
          <div className="char-pages-track" style={{ transform: `translateX(${-page * 100}%)` }}>
            <div className="char-page"><OverviewPage char={character} set={set} storyId={storyId} /></div>
            <div className="char-page"><CharacterMapPage char={character} set={set} setLA={setLA} /></div>
            <div className="char-page"><CharacterArcPage char={character} set={set} setNested={setNested} /></div>
            <div className="char-page"><MorePage char={character} set={set} /></div>
          </div>
        </div>

        <button className="char-page-arrow" onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))} disabled={page === PAGES.length - 1} aria-label="Next page">›</button>
      </div>

      <div className="char-page-dots">
        {PAGES.map((label, i) => (
          <button key={i} className={`char-page-dot ${i === page ? 'active' : ''}`} onClick={() => setPage(i)} title={label} />
        ))}
      </div>
    </div>
  );
}
