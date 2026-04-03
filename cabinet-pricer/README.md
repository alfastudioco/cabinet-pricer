# CabinetPricer

AI-powered cabinet estimating tool. Upload elevation drawings or photos and get instant pricing breakdowns with upper/lower linear foot costs.

## Features
- 📐 **Layout Mode** — Upload cabinet elevation drawings, AI reads dimensions and calculates $/LF
- 📷 **Photo Mode** — Take or upload a photo of cabinets, AI identifies style and estimates pricing
- Upper/lower cabinet cost split (60/40)
- Configurable specs: grade, box material, door style, finish, hardware
- Target price input for $/LF back-calculation

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npm start
```

### 3. Build for production
```bash
npm run build
```

## Deploy to Vercel
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import from GitHub
3. Select this repo — Vercel auto-detects React
4. Click Deploy

## Deploy to Netlify
1. Run `npm run build`
2. Drag the `build/` folder to netlify.com/drop

## Notes
- Uses Anthropic Claude API (claude-sonnet-4-20250514)
- API key is handled by the Claude.ai proxy — no key needed when running from Claude artifacts
- For standalone deployment, you will need to add your own Anthropic API key to the fetch headers in `src/App.js`
