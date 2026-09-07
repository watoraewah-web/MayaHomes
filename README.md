# Warrior of Faith International Christian Ministry

**Turn worship lyrics into presentation-ready slides.**

Warrior of Faith International Christian Ministry is a church worship song
lyrics-to-PowerPoint generator. Paste song lyrics, let Warrior of Faith
International Christian Ministry automatically organize them into sections (Verse, Chorus, Bridge,
Pre-Chorus, Intro, Outro, Tag, Refrain, ...), edit the detected structure,
preview the presentation, and generate a real `.pptx` file.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** — neutral, production-grade UI (black / white / gray, SVG icons only)
- **Supabase** — Auth and PostgreSQL with Row Level Security
- **PptxGenJS** — real PowerPoint generation in the browser

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Open **SQL Editor** in the Supabase dashboard and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the tables
   (`profiles`, `songs`, `song_sections`, `presentations`), transaction
   functions, triggers, and Row Level Security policies. It also secures any
   legacy `maya-assets` bucket without deleting its objects.
3. Recommended: in **Authentication -> Providers -> Email**, disable
   "Confirm email" if you want users to sign in immediately after sign-up
   (otherwise they must click the confirmation link first).

### 2. Configure environment variables

Copy the example file and fill in your project credentials from
**Project Settings -> API**:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build: `npm run build && npm start`.

## The workflow

1. **Sign up / Sign in** — email + password authentication via Supabase Auth.
2. **Dashboard** — "Welcome to Warrior of Faith International Christian Ministry", Create New Song, recent songs with
   Edit / Present / Generate PowerPoint / Delete actions.
3. **Create Song** — enter title + artist, paste the complete lyrics, click
   **Analyze Lyrics**.
4. **Parser** — recognizes `Verse 1`, `Chorus`, `Pre-Chorus`, `Bridge`,
   `Intro`, `Outro`, `Ending`, `Tag`, `Refrain` (and common variants such as
   `[Verse 1]`, `CHORUS`, `pre-chorus`, `Verse 2:`). Blocks with no recognized
   label are kept as **Uncategorized** — lyrics are never rewritten or lost.
5. **Section editor** — every section is a card: change its type, rename it,
   edit the lyrics, move it up/down, duplicate it, delete it, or add new ones.
   All changes auto-save to Supabase.
6. **Preview** — live slide preview with Previous / Next navigation, slide
   counter, previous and next slide thumbnails, and keyboard arrows.
7. **Presentation settings** — aspect ratio (16:9 / 4:3), font family, size,
   weight, text alignment, text position (top/center/bottom), max lines per
   slide, section label toggle, and background (solid color, uploaded image,
   or session-local image/video — selected media is held in the browser with
   an object URL and is cleared when the page or session is reloaded. Images
   can be used for the current PowerPoint export; exported slides fall back to
   a dark solid background for video because `.pptx` does not support video
   backgrounds. Media is not uploaded or persisted to Supabase Storage.
8. **Generate PowerPoint** — produces a real, fully formatted `.pptx` named
   `WFICM - [Song Title].pptx` and downloads it.

## Data model

- `profiles` — id, full_name, created_at (auto-created on sign-up)
- `songs` — id, user_id, title, artist, raw_lyrics, created_at, updated_at
- `song_sections` — id, song_id, section_type, section_label, content,
  section_order, created_at
- `presentations` — id, user_id, song_id, settings (jsonb), created_at, updated_at

All tables use UUID primary keys, foreign keys with `on delete cascade`, and
Row Level Security so users can only ever access their own rows.

## Slide layout architecture

Preview and PowerPoint export share **one slide model**, so what you see in the
browser is exactly what the `.pptx` contains:

```
RAW LYRICS
    ↓
SECTION PARSER (src/lib/parser.ts)
    ↓
STRUCTURED SONG SECTIONS
    ↓
SLIDE GENERATOR (src/lib/slides.ts)
    ↓  text measurement (src/lib/textMeasure.ts: real canvas metrics
    ↓  in the browser, Arial-metric estimate elsewhere)
SLIDE MODEL (wrapped visual lines + per-slide font size)
    ↓
┌───────────────┬──────────────────┐
│ BROWSER       │ POWERPOINT       │
│ PREVIEW       │ GENERATION       │
└───────────────┴──────────────────┘
```

Layout rules:

- Every original lyric line is a semantic line — line breaks the user typed
  are respected and lines are never merged or reordered.
- A semantic line wider than the usable slide width wraps at **word
  boundaries** (words are never split). Wrapping is based on measured text
  width, not a fixed word count.
- Slides group up to `maxLinesPerSlide` original lines. If the group does not
  fit the usable area, the font auto-fits downward (never below ~55% of the
  chosen size / 18pt); if it still does not fit, the group splits into
  another slide. Extremely long single lines split across slides at the floor
  font rather than being shrunk into unreadability.
- Geometry (1280×720 / 960×720 logical px at 96dpi, ~9% horizontal and 8%
  vertical padding, 1.2 line height, label height + 16px gap) is defined once
  in `src/lib/slides.ts` and consumed by both the preview and the PPTX export.
- Repeated sections (multiple choruses, etc.) are always preserved in order.

Run the layout regression suite (parser variations, wrapping, splitting,
auto-fit, both aspect ratios, label on/off, and real PPTX package checks)
with:

```bash
npm test
```

## Copyright note

Warrior of Faith International Christian Ministry treats lyrics strictly as user-provided content. It does not scrape or
fetch lyrics from third-party sources. Only paste lyrics you are authorized
to use.
