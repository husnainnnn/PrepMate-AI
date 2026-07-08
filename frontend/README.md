# InterviewAI — Landing Page

Cinematic, fullscreen welcome page for an AI-powered interview preparation
platform. Built with React + Vite + TypeScript + Tailwind CSS, in a
shadcn/ui-style component structure.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Project structure

```
interview-ai/
├─ src/
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ BackgroundVideo.tsx   # fullscreen looping hero video
│  │  │  ├─ Navbar.tsx            # glass navbar + nav links + CTA
│  │  │  └─ Hero.tsx              # heading, subtext, main CTA
│  │  └─ ui/
│  │     └─ button.tsx            # shadcn/ui-style Button (cva variants)
│  ├─ services/
│  │  └─ api.ts                   # fetch wrapper for talking to a backend
│  ├─ lib/
│  │  └─ utils.ts                 # `cn()` classname merge helper
│  ├─ hooks/                      # place custom hooks here as the app grows
│  ├─ types/                      # shared TypeScript types/interfaces
│  ├─ App.tsx                     # composes Navbar + Hero + background video
│  ├─ main.tsx                    # React entry point
│  └─ index.css                   # theme tokens, fonts, liquid-glass, animations
├─ index.html
├─ tailwind.config.js             # color tokens, fonts, fade-rise animations
├─ vite.config.ts                 # path alias "@/..." + dev API proxy
├─ .env.example                   # documents backend env variables
└─ package.json
```

This is a standard, scalable layout: `components/layout` holds page sections,
`components/ui` holds small reusable primitives (the way shadcn/ui generates
them), and `services` is where all backend calls live so UI components never
call `fetch` directly.

## Connecting a backend

The frontend is already wired to talk to an API through `src/services/api.ts`:

```ts
import { api } from '@/services/api'

const user = await api.get('/user/me')
await api.post('/interviews', { role: 'Frontend Engineer' })
```

Two ways to point it at a real backend:

1. **Local development** — leave `VITE_API_BASE_URL` unset. Requests to
   `/api/*` are proxied by Vite (see `vite.config.ts`) to whatever backend URL
   you set in `.env` as `VITE_API_PROXY_TARGET` (defaults to
   `http://localhost:4000`). This avoids CORS problems while developing.

2. **Production** — set `VITE_API_BASE_URL` to your deployed backend's full
   URL, e.g. `VITE_API_BASE_URL=https://api.interviewai.com`. The app will
   call that origin directly, so make sure the backend allows CORS from your
   frontend's domain.

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Any backend works here (Node/Express, FastAPI, Django, Supabase, etc.) —
`api.ts` only assumes a JSON REST API. If you use a different pattern
(GraphQL, tRPC, Supabase client), swap out the contents of `services/` and
keep the rest of the app the same.

## Notes

- Background video URL and copy come directly from the design brief.
- Colors, fonts, and animation timings are defined as CSS variables/utilities
  in `src/index.css` and `tailwind.config.js`, not hardcoded in components.
- `prefers-reduced-motion` is respected — animations are disabled for users
  who request it at the OS level.
