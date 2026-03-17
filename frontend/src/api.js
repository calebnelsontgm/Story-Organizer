async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── AI chat ──────────────────────────────────────────────────────────────────

export function sendMessage(messages, storyContext) {
  return req('POST', '/api/chat', { messages, ...(storyContext ? { storyContext } : {}) });
}

// ── Stories ───────────────────────────────────────────────────────────────────

export function listStories() {
  return req('GET', '/api/stories');
}

export function createStory(id, name, createdAt) {
  return req('POST', '/api/stories', { id, name, createdAt });
}

export function updateMeta(storyId, updates) {
  return req('PUT', `/api/stories/${storyId}/meta`, updates);
}

// Load all story data in parallel
export async function loadStoryData(storyId) {
  const [characters, scenes, themes, worldbuilding, cover] = await Promise.all([
    req('GET', `/api/stories/${storyId}/characters`),
    req('GET', `/api/stories/${storyId}/scenes`),
    req('GET', `/api/stories/${storyId}/themes`),
    req('GET', `/api/stories/${storyId}/worldbuilding`),
    req('GET', `/api/stories/${storyId}/cover`),
  ]);
  return { characters, scenes, themes, worldbuilding, cover };
}

// ── Autosave ──────────────────────────────────────────────────────────────────

export function saveCharacters(storyId, characters) {
  return req('PUT', `/api/stories/${storyId}/characters`, { characters });
}

export function saveScenes(storyId, scenes) {
  return req('PUT', `/api/stories/${storyId}/scenes`, scenes);
}

export function saveThemes(storyId, themes) {
  return req('PUT', `/api/stories/${storyId}/themes`, themes);
}

export function saveWorldbuilding(storyId, entries) {
  return req('PUT', `/api/stories/${storyId}/worldbuilding`, entries);
}

export function saveCover(storyId, cover) {
  return req('PUT', `/api/stories/${storyId}/cover`, cover);
}

export function uploadCoverImage(storyId, imageData) {
  return req('POST', `/api/stories/${storyId}/cover/image`, { imageData });
}

// ── Images ────────────────────────────────────────────────────────────────────

export function uploadImage(storyId, charId, imageData) {
  return req('POST', `/api/stories/${storyId}/images/${charId}`, { imageData });
}
