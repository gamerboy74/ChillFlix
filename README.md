<div align="center">
  <img src="public/images/logo2.png" alt="ChillFlix Logo" width="220" />
  
  <p align="center">
    <strong>A premium, full-stack Netflix-inspired cinema streaming platform with a self-healing Playwright scraper engine, multi-profile account systems, and custom storage upload integration.</strong>
  </p>

  <p align="center">
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Framework-Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    </a>
    <a href="https://supabase.com/">
      <img src="https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Postgres" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    </a>
  </p>

  <p align="center">
    <a href="https://next-auth.js.org/">
      <img src="https://img.shields.io/badge/Auth-NextAuth.js-8A2BE2?style=flat-square&logo=nextauth&logoColor=white" alt="NextAuth" />
    </a>
    <a href="https://playwright.dev/">
      <img src="https://img.shields.io/badge/Scraper-Playwright%20Headless-2E8B57?style=flat-square&logo=playwright&logoColor=white" alt="Playwright Scraper" />
    </a>
    <a href="https://zustand-demo.pmnd.rs/">
      <img src="https://img.shields.io/badge/State-Zustand%20%26%20SWR-orange?style=flat-square" alt="Zustand" />
    </a>
  </p>
</div>

---

## 🎬 About ChillFlix

**ChillFlix** is a state-of-the-art web application that replicates the core Netflix experience, but with a major addition: **a built-in, self-healing Playwright Scraper Engine**. Instead of relying on static, fragile video URLs that break within days, ChillFlix resolves streaming server mirrors (such as VidCore, Videasy, and VidNest) **on-demand** or via **bulk background scraping** from the Admin Console. 

With full multi-profile management, direct Supabase Storage avatar uploads, and an comprehensive Admin Panel, ChillFlix serves as a complete portfolio showcase of advanced React/Next.js architecture, direct Postgres storage integrations, and headless browser automation.

---

## ✨ Features

### 🖥️ Cinematic Frontend UI
* **True Netflix Experience:** Seamless landing page with interactive billboard trailers, responsive sliders, hover cards, and smooth transitions.
* **Modern Typography:** Styled with custom Google Fonts (`Outfit` & `Inter`) for a high-end typography feel.
* **Glassmorphic Dropdowns:** Custom dropdown navigation systems for user accounts, language, settings, and player servers.
* **Cinematic Video Player:** Built-in player modal supporting dynamic server source switching, loading sequences, region-bypass states, and custom iframe integration.

### 👥 Multi-Profile Engine
* **Up to 5 Profiles:** Supports Netflix-style profile management per user account.
* **Preset & Custom Avatars:** Choose from official Netflix character presets or upload a custom avatar file.
* **Direct Supabase Storage:** Integrates direct-to-cloud file uploads into the Supabase `avatars` bucket with strict size validation (2 MB limit) and auto-updating database schemas.
* **Profile Isolation:** Profiles maintain independent Watchlists/Favorites and account settings.

### 🤖 Automation Scraper Engine
* **Headless Browser Resolution:** Playwright automates headless Chromium sessions to search streaming bases, bypass regional geo-blocks, resolve complex redirects, and harvest playable server mirrors.
* **Fallback Routing:** If the dynamic proxy connection fails, the frontend player seamlessly falls back to local cached servers.
* **Supported Mirrors:** Automatically extracts iframe URLs for VidCore, Videasy, VidNest, Cinevo Flash, AutoEmbed Pro, and Scapa (Multi).

### 🛡️ Admin Command Center
* **TMDB Catalog Integration:** Search titles on The Movie Database (TMDB) and import full production metadata (posters, genres, synopsis, ratings, and episodes counts) with one click.
* **Scraper Console:** Real-time console with Server-Sent Events (SSE) / chunked log streaming to view seeding progress.
* **Seasons & Episode Manager:** In-depth mirrors editor allowing manual override of titles and JSON server streams.
* **Domain Configuration:** Live updates to base scrape URLs directly from the UI when source mirrors migrate domains.

---

## 📐 Architecture & Data Flow

When a user clicks **Play** on a title, ChillFlix runs the following smart routing pipeline to ensure buffer-free playback:

```mermaid
sequenceDiagram
    autonumber
    actor User as 👥 User/Viewer
    participant App as 💻 React App
    participant DB as 🗄️ PostgreSQL (Supabase)
    participant Engine as 🤖 Playwright Scraper

    User->>App: Clicks "Play" on Movie/Show
    App->>DB: Fetch S1E1 Episode Server Mirrors
    
    alt Mirrors Cache Found (Starts with "{")
        DB-->>App: Return JSON Mirror Streams
        App-->>User: Render Custom Video Player with Server Select Dropdown
    else Cache Missing or Empty
        App->>Engine: Trigger Dynamic Background Scraper (POST /api/movies/stream)
        Engine->>Engine: Launch Headless Chromium
        Engine->>Engine: Search & Bypasses Geo-Redirects
        Engine->>Engine: Harvest Iframe URL List (Sources Map)
        Engine->>DB: Upsert JSON Sources to "Episode" Table
        Engine-->>App: Return Stream Sources
        App-->>User: Load Video Player (Seamlessly resolved on-demand!)
    end
```

---

## 🗃️ Database Schema & Storage

ChillFlix runs a custom, lightweight PostgreSQL schema optimized for direct Supabase client queries.

### Schema Blueprint
* **`User` / `Account` / `Session`**: Auth schemas configured to work with NextAuth.js JWT.
* **`Profile`**: Holds user profiles (id, userId, name, image, favouriteIds).
* **`Movie`**: Contains general metadata (title, genre, poster, description, type: `movie` | `series`, seasonsData).
* **`Episode`**: Tracks stream assets. Every movie is represented as `season = 1`, `episode = 1`. TV Series are populated with a row for each season episode. The `videoUrl` text column holds stringified JSON of the mirrors:
  ```json
  {
    "VidCore (active)": "https://vidcore.net/movie/1433117",
    "Videasy": "https://player.videasy.net/movie/1433117",
    "VidNest": "https://vidnest.fun/movie/1433117"
  }
  ```

### Storage Buckets (Supabase Storage)
1. **`avatars` (Public):** Stores custom user profile images (max 2 MB limit).
2. **`thumbnails` (Public):** Stores movie posters and background backdrops (max 5 MB limit).
3. **`videos` (Private):** Reserved bucket for direct self-hosted files, protected by signed URL resolution.

---

## 🛠️ Tech Stack

| Technology | Purpose | Key Library / Core |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (Pages Router) | `next/router`, SWR |
| **Language** | TypeScript 5 | Fully-typed query states |
| **Styling** | Tailwind CSS | Mobile-first layouts, glassmorphism UI |
| **Database** | PostgreSQL | Hosted on Supabase, direct schema queries |
| **Authentication** | NextAuth.js | Credentials, Google OAuth, GitHub OAuth |
| **Scraper** | Playwright | Headless browser automation |
| **State Management** | Zustand | Global profile contexts |
| **Icons & Elements** | Lucide React | Modern cinematic icon systems |

---

## 🚀 Getting Started & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/gamerboy74/ChillFlix.git
cd chillflix
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in the parameters:
```env
# Supabase Postgres URLs
DATABASE_URL="postgresql://postgres.[ref]:[pw]@aws-0-[reg].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres"

# NextAuth Secrets
NEXTAUTH_SECRET="your_nextauth_secret_here"          # Generate with: openssl rand -base64 32
NEXTAUTH_JWT_SECRET="your_jwt_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# Service Keys
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"

# OAuth Credentials (Optional)
GITHUB_ID=""
GITHUB_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# TMDB Key (Highly recommended for Admin Import)
TMDB_API_KEY="your_tmdb_api_key_here"
```

### 3. Initialize Database & Storage
* Run the SQL scripts in order under the **Supabase Dashboard > SQL Editor**:
  1. [`supabase/schema.sql`](file:///c:/Users/gboy3/OneDrive/Documents/ChillFlix/supabase/schema.sql) — Generates Core, Movie, and Episode tables.
  2. [`supabase/profiles.sql`](file:///c:/Users/gboy3/OneDrive/Documents/ChillFlix/supabase/profiles.sql) — Generates Profile tables.
  3. [`supabase/buckets.sql`](file:///c:/Users/gboy3/OneDrive/Documents/ChillFlix/supabase/buckets.sql) — Declares avatars, thumbnails, and videos storage buckets and configures bucket policies.

### 4. Run Development Server
```bash
npm run dev
```
Open [https://chill-flix-y56.vercel.app/](https://chill-flix-y56.vercel.app/) to view the app!

### 5. Seed the Catalog
1. Log in with an account.
2. Toggle the user database flag to `isAdmin = true` directly in the Supabase `User` table to access Admin privileges.
3. Open the **Admin Panel** (`/admin`) from the navigation menu.
4. Go to **Import (TMDB)** to search and bulk-import movies, or go to **Scraper Engine** and press **Seed from Cinevo** to pull titles directly from the source mirrors.
5. In **Scraper Engine**, press **Resolve Streams** to sequentially build the server mirror caches for all imported titles.

---

## 🤝 Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/gamerboy74">gamerboy74</a></p>
</div>
