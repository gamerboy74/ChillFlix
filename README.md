# 🎬 ChillFlix

> A full-stack Netflix-inspired streaming platform with an integrated auto-resolving scraper engine for movies and TV series.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## ✨ Features

- 🔐 **Multi-provider authentication** — Credentials, Google OAuth, GitHub OAuth via NextAuth.js
- 🎬 **Dynamic content browsing** — Trending, Favourites, Action, Drama, and "Only on ChillFlix" exclusive sections
- 🤖 **Built-in Scraper Engine** — Automatically fetches metadata from TMDB and resolves playback streams using Playwright
- ❤️ **Persistent favourites** — Save and remove movies directly to your profile, stored in PostgreSQL (Supabase)
- 📱 **Fully responsive** — Tailwind CSS with mobile-first design, interactive modals, and sleek cinematic UI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js 15 (Frontend)          │
│         Pages Router · TypeScript           │
└─────────────────┬───────────────────────────┘
                  │ API Routes & NextAuth
        ┌─────────┴─────────┐
        │                   │
   ┌────▼────┐        ┌─────▼──────┐
   │NextAuth │        │ PostgreSQL │
   │  JWT    │        │  Supabase  │
   └─────────┘        └────────────┘
        │
   ┌────▼────────────────────┐
   │  Scraper Engine         │
   │  (Playwright + TMDB)    │
   └─────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (Pages Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | NextAuth.js |
| **State & Hooks** | Zustand, SWR |
| **Scraping** | Playwright |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18.18.0
- Supabase account & project

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/gamerboy74/ChillFlix.git
cd chillflix

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, NextAuth, and TMDB credentials in .env.local

# 4. Initialize Supabase Database
# Run the SQL provided in supabase/schema.sql in your Supabase SQL Editor.

# 5. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in!

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

- `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_SECRET` & `NEXTAUTH_URL`
- `TMDB_API_KEY`

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

[MIT](LICENSE)
