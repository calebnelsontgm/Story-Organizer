# How to run

## 1. Add your Gemini API key

```
cd backend
cp .env.example .env
# edit .env and paste your key
```

## 2. Start the backend

```
cd backend
GEMINI_API_KEY=your_key node server.js
```

Or on Windows PowerShell:
```
$env:GEMINI_API_KEY="your_key"; node server.js
```

## 3. Start the frontend (separate terminal)

```
cd frontend
npm run dev
```

Open http://localhost:5173
