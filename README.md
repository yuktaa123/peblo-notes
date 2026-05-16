# Peblo Notes

AI-powered collaborative notes workspace built for the Peblo Full Stack Developer Challenge.

**Live demo:** [peblo-notes-woad-omega.vercel.app](https://peblo-notes-woad-omega.vercel.app)
**Demo video:** _add YouTube unlisted link after recording_

## Screenshots

![Login](samples/screenshots/01-login.png)
*Email/password authentication*

![Notes workspace with AI insights](samples/screenshots/02-notes-with-ai.png)
*Note editor with auto-save, tags, and AI-generated summary, action items, and suggested title*

![Dashboard](samples/screenshots/03-dashboard.png)
*Productivity dashboard with stats, top tags, and weekly activity*

![Public share page](samples/screenshots/04-shared-page.png)
*Anyone with the link can view shared notes — no login required*

## Features

- Email/password authentication with route protection via Supabase Auth + RLS
- Markdown notes editor with debounced auto-save (1.5s)
- Tags, optional category, archive
- AI-generated summaries, action items, and suggested titles via Gemini 2.5 Flash
- Smart caching: AI runs only when note content changes since last generation
- Keyword search across title and content
- Tag filtering and sort options
- Public share links with revoke
- Insights dashboard: totals, weekly activity bar chart, top tags
- Dark mode (system / light / dark via next-themes)
- Keyboard shortcuts (Cmd+K search, Cmd+N new note)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Single repo, server components, route handlers in one place |
| Language | TypeScript | End-to-end type safety with generated Supabase types |
| UI | Tailwind 4 + shadcn/ui (Base UI) | Production-quality components, themeable |
| Auth + DB | Supabase (Postgres + RLS) | Auth and database in one product; RLS replaces hand-rolled auth checks |
| AI | Google Gemini 2.5 Flash | Free tier, structured JSON output via responseSchema, fast |
| Deploy | Vercel | Zero-config Next.js, GitHub integration |

## Architecture

Single Next.js project. Server Components render protected pages, Route Handlers expose the API. Supabase handles authentication and Postgres with Row Level Security enforcing per-user access — the API routes are intentionally thin and rely on RLS for authorization rather than duplicating checks server-side. The Supabase session is refreshed on every request via `src/proxy.ts` (Next 16's middleware replacement).

Auto-save debounces 1.5s of keystrokes into a single PATCH. AI generation is cached on the note row: if `ai_last_generated_at >= updated_at` and the user hasn't forced regenerate, the API returns the cached values instead of calling Gemini again — saves cost and latency. Gemini structured output (`responseMimeType: "application/json"` + `responseSchema`) guarantees parseable JSON, removing parse-error edge cases.

The public `/shared/[shareId]` page uses a dedicated anon Supabase client server-side, with an RLS policy that allows reads only when `is_public = true`. No `user_id` is ever exposed to public viewers.

## Database schema

See `samples/schema.sql` or `supabase/migrations/0001_initial_schema.sql` for the full schema. Highlights:

- `notes` table with text content, `tags text[]`, AI cache columns, and `share_id` for public links
- `ai_usage` table for tracking generation events
- Per-user RLS policies on both tables (`auth.uid() = user_id`)
- Additional public-read policy on `notes` for `is_public = true`
- `get_top_tags(uid, limit_count)` SQL function for dashboard

## API endpoints

| Method & path | Description |
|---|---|
| `GET /api/notes` | List notes; query params: archived, tag, q, sort |
| `POST /api/notes` | Create a new note |
| `GET /api/notes/:id` | Fetch single note |
| `PATCH /api/notes/:id` | Update fields (title, content, tags, category, is_archived) |
| `DELETE /api/notes/:id` | Delete note |
| `POST /api/notes/:id/ai` | Generate AI insights (cached) |
| `POST /api/notes/:id/share` | Create or return existing public share link |
| `DELETE /api/notes/:id/share` | Revoke share link |
| `GET /api/shared/:shareId` | Public, no auth — fetch shared note |
| `GET /api/insights` | Dashboard stats for current user |

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/yuktaa123/peblo-notes.git
cd peblo-notes
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values:
#   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   GEMINI_API_KEY=...                       (get one at https://aistudio.google.com/apikey)
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 3. Link to your Supabase project and push the schema
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 4. (Optional) Regenerate TypeScript types from your DB
npx supabase gen types typescript --linked > src/types/supabase.ts

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you're in.

## Deploy

The app deploys to Vercel with zero configuration:

1. Push the repo to GitHub.
2. In Vercel, import the project.
3. Add the same environment variables from `.env.local`, but set `NEXT_PUBLIC_SITE_URL` to your deployed URL (e.g. `https://peblo-notes.vercel.app`) — this is used when building share links returned by `POST /api/notes/:id/share`.
4. Deploy. Every push to `main` ships automatically.

## Project structure

```
src/
  app/
    (app)/             # Authenticated routes (notes, dashboard) with shared layout
    (auth)/            # Login and signup pages
    api/               # Route handlers
    shared/[shareId]/  # Public share page (no auth)
  components/          # React components (shadcn UI + app components)
  lib/
    supabase/          # Browser, server, and admin clients
    ai.ts              # Gemini wrapper with structured output
    api-helpers.ts     # Custom errors, auth helper, error handler
  proxy.ts             # Next 16 proxy (formerly middleware) — refreshes session, route guards
  types/               # Generated Supabase types + aliases
supabase/migrations/   # SQL schema migrations
samples/               # Sample API responses, schema, screenshots
```
