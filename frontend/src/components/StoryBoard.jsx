export default function StoryBoard({ stories, loading, onCreate, onOpen }) {
  return (
    <div className="sb-root">
      <div className="sb-header">
        <h1 className="sb-title">Story Organizer</h1>
      </div>

      {loading ? (
        <div className="sb-loading">Loading…</div>
      ) : (
        <div className="sb-grid">
          <button className="sb-new-card" onClick={onCreate}>
            <span className="sb-new-plus">+</span>
            <span className="sb-new-label">New Story</span>
          </button>

          {stories.map((s) => (
            <button key={s.id} className="sb-story-card" onClick={() => onOpen(s.id)}>
              <div
                className="sb-card-image"
                style={s.coverImageUrl ? { backgroundImage: `url(${s.coverImageUrl})` } : undefined}
              />
              <div className="sb-card-info">
                <span className="sb-story-name">{s.name}</span>
                <span className="sb-story-meta">
                  {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
