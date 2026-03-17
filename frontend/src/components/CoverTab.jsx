import { useRef, useState, useEffect } from 'react';
import { uploadCoverImage } from '../api';

const FONTS = [
  { name: 'Playfair Display',   label: 'Playfair Display'   },
  { name: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { name: 'Cinzel',             label: 'Cinzel'             },
  { name: 'Uncial Antiqua',     label: 'Uncial Antiqua'     },
  { name: 'Bebas Neue',         label: 'Bebas Neue'         },
  { name: 'Montserrat',         label: 'Montserrat'         },
  { name: 'Orbitron',           label: 'Orbitron'           },
  { name: 'Exo 2',              label: 'Exo 2'              },
  { name: 'Pacifico',           label: 'Pacifico'           },
  { name: 'Caveat',             label: 'Caveat'             },
  { name: 'Cinzel Decorative',  label: 'Cinzel Decorative'  },
  { name: 'Abril Fatface',      label: 'Abril Fatface'      },
];

export default function CoverTab({ storyId, storyName, onRename, cover, onCoverChange }) {
  const fileInputRef = useRef(null);
  const synopsisRef = useRef(null);
  const [fontOpen, setFontOpen] = useState(false);
  const fontBtnRef = useRef(null);

  // Auto-resize synopsis to fit content
  useEffect(() => {
    const el = synopsisRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [cover.synopsis]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageData = ev.target.result;
      try {
        const { url } = await uploadCoverImage(storyId, imageData);
        onCoverChange({ ...cover, imageUrl: url });
      } catch (err) {
        console.error('Cover image upload failed', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectFont = (fontName) => {
    onCoverChange({ ...cover, font: fontName });
    setFontOpen(false);
  };

  return (
    <div
      className="cover-root"
      style={cover.imageUrl ? { backgroundImage: `url(${cover.imageUrl})` } : undefined}
      onClick={() => fontOpen && setFontOpen(false)}
    >
      <div className="cover-overlay" />

      <div className="cover-content">
        {/* Title */}
        <input
          className="cover-title"
          style={{ fontFamily: `'${cover.font}', serif` }}
          value={storyName}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Story Title"
          spellCheck={false}
        />

        {/* Synopsis */}
        <textarea
          ref={synopsisRef}
          className="cover-synopsis"
          style={{ fontFamily: `'${cover.font}', serif` }}
          value={cover.synopsis}
          onChange={(e) => onCoverChange({ ...cover, synopsis: e.target.value })}
          placeholder="What is this story about?"
        />
      </div>

      {/* Bottom bar */}
      <div className="cover-bottom-bar">
        {/* Font picker */}
        <div className="cover-font-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            ref={fontBtnRef}
            className="cover-action-btn"
            onClick={() => setFontOpen((v) => !v)}
            title="Change font"
          >
            Aa
          </button>
          {fontOpen && (
            <div className="cover-font-popover">
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  className={`cover-font-option${cover.font === f.name ? ' active' : ''}`}
                  style={{ fontFamily: `'${f.name}', serif` }}
                  onClick={() => handleSelectFont(f.name)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          className="cover-action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Set background image"
        >
          {cover.imageUrl ? '⟳ Change Image' : '+ Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}
