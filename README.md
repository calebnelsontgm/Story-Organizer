# Story Organizer

A personal story organization tool built because every other platform falls short.

Apps like Notion and Google Docs work fine as general-purpose tools, but for me personally they don't have the kind of structure that is custom built to help you when you're deep in a story - tracking characters and their motives, keeping all the worldbuilding consistent, and laying out scenes in a way you can easily navigate. This is built around the specific attributes that matter for that. 

## What's in it

**Characters** — A dedicated tab for building out characters. Each one gets their own profile with whatever detail you want to fill in.

**Themes** — Track the themes running through your story as individual entries you can build on over time.

**Worldbuilding** — A place to store lore, settings, rules, groups, or whatever else your world needs.

**Story Tree** — A visual canvas where you can lay out every scene as a node, connect them, and actually see the shape of your story. More navigable than a list.

**Story Board** — A home screen that lets you manage multiple stories. Each story is fully self-contained with its own files.

**Claude AI Agent** — A sidebar AI that can do the tedious parts for you. It knows what story you're working on and what's already in it, so you can ask it to create characters, write scenes, add worldbuilding entries, or update existing content without having to click through everything manually.

## Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **AI**: Claude API (Anthropic)
- **Story data**: JSON files stored locally per story

## Running it

You'll need an Anthropic API key for the AI component.

**Backend**
```bash
cd backend
ANTHROPIC_API_KEY=your_key_here node server.js
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on port `3001`.

Story data is saved to `backend/data/stories/` - this folder stays local and is not tracked by git.
