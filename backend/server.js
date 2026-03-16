import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data', 'stories');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // large limit for base64 image uploads

const client = new Anthropic();
const MODEL = 'claude-haiku-4-5';

// ── File I/O helpers ─────────────────────────────────────────────────────────

function storyDir(id) {
  return path.join(DATA_DIR, id);
}

function storyFile(id, ...parts) {
  return path.join(storyDir(id), ...parts);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJSON(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ── Story routes ─────────────────────────────────────────────────────────────

// List all stories (meta only)
app.get('/api/stories', async (req, res) => {
  await ensureDir(DATA_DIR);
  const dirs = await fs.readdir(DATA_DIR);
  const metas = await Promise.all(
    dirs.map((id) => readJSON(storyFile(id, 'meta.json'), null))
  );
  res.json(metas.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt));
});

// Create a new story (frontend supplies id + name + createdAt)
app.post('/api/stories', async (req, res) => {
  const { id, name, createdAt } = req.body;
  const dir = storyDir(id);
  await ensureDir(dir);
  await ensureDir(path.join(dir, 'characters'));
  await ensureDir(path.join(dir, 'images'));

  const meta = { id, name, createdAt };
  await writeJSON(storyFile(id, 'meta.json'), meta);
  await writeJSON(storyFile(id, 'scenes.json'), { nodes: [], edges: [] });
  await writeJSON(storyFile(id, 'themes.json'), []);
  await writeJSON(storyFile(id, 'worldbuilding.json'), { factions: [], locations: [], history: [], misc: [] });

  res.json(meta);
});

// Update story meta (name, etc.)
app.put('/api/stories/:id/meta', async (req, res) => {
  const current = await readJSON(storyFile(req.params.id, 'meta.json'), {});
  await writeJSON(storyFile(req.params.id, 'meta.json'), { ...current, ...req.body });
  res.json({ ok: true });
});

// ── Per-story data routes ────────────────────────────────────────────────────

// Characters — full array in/out; backend manages individual files
app.get('/api/stories/:id/characters', async (req, res) => {
  const dir = storyFile(req.params.id, 'characters');
  await ensureDir(dir);
  const files = await fs.readdir(dir);
  const chars = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map((f) => readJSON(path.join(dir, f)))
  );
  res.json(chars.filter(Boolean));
});

app.put('/api/stories/:id/characters', async (req, res) => {
  const { characters } = req.body;
  const dir = storyFile(req.params.id, 'characters');
  await ensureDir(dir);
  const existing = await fs.readdir(dir);
  await Promise.all(
    existing.filter((f) => f.endsWith('.json')).map((f) => fs.unlink(path.join(dir, f)))
  );
  await Promise.all(
    characters.map((c) => writeJSON(path.join(dir, `${c.id}.json`), c))
  );
  res.json({ ok: true });
});

// Scenes (React Flow nodes + edges)
app.get('/api/stories/:id/scenes', async (req, res) => {
  res.json(await readJSON(storyFile(req.params.id, 'scenes.json'), { nodes: [], edges: [] }));
});

app.put('/api/stories/:id/scenes', async (req, res) => {
  await writeJSON(storyFile(req.params.id, 'scenes.json'), req.body);
  res.json({ ok: true });
});

// Themes
app.get('/api/stories/:id/themes', async (req, res) => {
  res.json(await readJSON(storyFile(req.params.id, 'themes.json'), []));
});

app.put('/api/stories/:id/themes', async (req, res) => {
  await writeJSON(storyFile(req.params.id, 'themes.json'), req.body);
  res.json({ ok: true });
});

// Worldbuilding
app.get('/api/stories/:id/worldbuilding', async (req, res) => {
  res.json(await readJSON(storyFile(req.params.id, 'worldbuilding.json'), { factions: [], locations: [], history: [], misc: [] }));
});

app.put('/api/stories/:id/worldbuilding', async (req, res) => {
  await writeJSON(storyFile(req.params.id, 'worldbuilding.json'), req.body);
  res.json({ ok: true });
});

// ── Image routes ─────────────────────────────────────────────────────────────

// Upload image (base64 data URL in JSON body)
app.post('/api/stories/:id/images/:charId', async (req, res) => {
  const { imageData } = req.body;
  const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: 'Invalid image data' });
  const [, ext, b64] = match;
  const imgDir = storyFile(req.params.id, 'images');
  await ensureDir(imgDir);
  // Delete any previous image files for this character
  const existing = await fs.readdir(imgDir);
  await Promise.all(
    existing
      .filter((f) => f.startsWith(`${req.params.charId}.`))
      .map((f) => fs.unlink(path.join(imgDir, f)))
  );
  const filename = `${req.params.charId}.${ext}`;
  await fs.writeFile(path.join(imgDir, filename), Buffer.from(b64, 'base64'));
  res.json({ url: `/api/stories/${req.params.id}/images/${filename}?t=${Date.now()}` });
});

// Serve image files
app.get('/api/stories/:id/images/:filename', async (req, res) => {
  const imgPath = path.resolve(storyFile(req.params.id, 'images', req.params.filename));
  try {
    await fs.access(imgPath);
    res.sendFile(imgPath);
  } catch {
    res.status(404).json({ error: 'Image not found' });
  }
});

// ── AI chat route ─────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'add_character',
    description: 'Add a named character and their description to the story structure.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name' },
        description: { type: 'string', description: 'Brief description of the character' },
        source_quote: { type: 'string', description: "Verbatim excerpt from the user's message this was extracted from" },
      },
      required: ['name', 'description', 'source_quote'],
    },
  },
  {
    name: 'place_in_act',
    description: 'Place a story beat or event into a specific act.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The story beat or event to place' },
        act_number: { type: 'integer', description: 'Act number: 1, 2, or 3' },
        source_quote: { type: 'string', description: "Verbatim excerpt from the user's message this was extracted from" },
      },
      required: ['content', 'act_number', 'source_quote'],
    },
  },
  {
    name: 'add_worldbuilding',
    description: 'Add a worldbuilding detail under a named category.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The worldbuilding detail' },
        category: {
          type: 'string',
          description: 'Category (e.g. "Setting", "Magic System", "History", "Factions")',
        },
        source_quote: { type: 'string', description: "Verbatim excerpt from the user's message this was extracted from" },
      },
      required: ['content', 'category', 'source_quote'],
    },
  },
  {
    name: 'create_scene',
    description: 'Create a new scene card in the Story Tree canvas.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short scene title' },
        summary: { type: 'string', description: 'What happens in this scene, based on what the user described' },
        notes: { type: 'string', description: 'Additional details or context the user mentioned' },
      },
      required: ['title', 'summary'],
    },
  },
  {
    name: 'edit_character',
    description: 'Edit a specific field on an existing character.',
    input_schema: {
      type: 'object',
      properties: {
        character_name: { type: 'string', description: 'Name of the character to edit (must match an existing character)' },
        field: {
          type: 'string',
          description: 'Field to update. Top-level: name, overview, coreUrge, originOfUrge, statedBelief, atFirst, laterOn, arcOutcomes, mood, hobbies, skills, habits, tastes, weaknesses. Nested (dot notation): lifeAreas.goals, lifeAreas.relationships, lifeAreas.lifestyle, lifeAreas.presentation, lifeAreas.dialogue, arcChanges.goals, arcChanges.relationships, arcChanges.lifestyle, arcChanges.presentation, arcChanges.dialogue',
        },
        value: { type: 'string', description: 'New value for the field' },
      },
      required: ['character_name', 'field', 'value'],
    },
  },
  {
    name: 'edit_scene',
    description: 'Edit the title, summary, or notes of an existing scene.',
    input_schema: {
      type: 'object',
      properties: {
        scene_title: { type: 'string', description: 'Current title of the scene to edit (must match an existing scene)' },
        field: { type: 'string', enum: ['title', 'summary', 'notes'], description: 'Which field to update' },
        value: { type: 'string', description: 'New value' },
      },
      required: ['scene_title', 'field', 'value'],
    },
  },
  {
    name: 'edit_theme',
    description: 'Edit the body text of an existing theme.',
    input_schema: {
      type: 'object',
      properties: {
        theme_name: { type: 'string', description: 'Name of the theme to edit (must match an existing theme)' },
        body: { type: 'string', description: 'New body text' },
      },
      required: ['theme_name', 'body'],
    },
  },
  {
    name: 'edit_worldbuilding',
    description: 'Edit the body of an existing worldbuilding entry.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category: factions, locations, history, or misc' },
        entry_title: { type: 'string', description: 'Title of the entry to edit (must match an existing entry)' },
        body: { type: 'string', description: 'New body text' },
      },
      required: ['category', 'entry_title', 'body'],
    },
  },
  {
    name: 'enter_clarification_mode',
    description: 'Ask the user a clarifying question before placing ambiguous content.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The clarifying question to ask the user' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of answer choices for the user',
        },
      },
      required: ['question', 'options'],
    },
  },
];

const SYSTEM_PROMPT = `You are a story organization assistant. Your job is to extract and structure story content from the user's freeform descriptions — you do NOT invent or embellish details the user hasn't mentioned.

Rules:
- Only use information explicitly stated by the user. Never infer or fabricate details.
- Use the available tools to structure content: create scenes, add characters, place act beats, add worldbuilding.
- If a user describes a scene or event, use create_scene to add it to the Story Tree with a short title and a summary based on what they said.
- If anything is ambiguous (e.g. unsure which act something belongs in), call enter_clarification_mode FIRST with a clear question and 2-4 options.
- Call enter_clarification_mode once per ambiguous element — do not batch multiple questions in one call.
- After clarification, proceed with the appropriate tool.
- You may make multiple tool calls in one response for multiple unambiguous elements.
- Keep output text brief — just acknowledge what you're doing.`;

app.post('/api/chat', async (req, res) => {
  const { messages, storyContext } = req.body;
  const system = storyContext
    ? `${SYSTEM_PROMPT}\n\nCurrent story context:\n${storyContext}`
    : SYSTEM_PROMPT;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      tools: TOOLS,
      messages,
    });
    res.json(response);
  } catch (err) {
    const status = err.status ?? 500;
    res.status(status).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
