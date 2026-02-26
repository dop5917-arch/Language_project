# English SRS (Next.js + Prisma + SQLite)

Minimal Anki-like English study app with spaced repetition.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma ORM
- SQLite (`prisma/dev.db`)
- Tailwind CSS
- Zod validation

## Features (MVP)

- Decks list + create
- Deck details + cards list
- Add card form
- Today overview (due/new/done)
- Review session (flip + rate: Again/Hard/Good/Easy)
- CSV import (upload file or paste text)
- Simplified SM-2 spaced repetition
- Review logs for every rating
- Installable web app (PWA) with home-screen icon

## Setup

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env
```

Optional (better image search in Smart Add):
- Add `PIXABAY_API_KEY` to `.env` (get a free key from [Pixabay API](https://pixabay.com/api/docs/))

3. Generate Prisma client

```bash
npm run prisma:generate
```

4. Run migration (creates `prisma/dev.db`)

```bash
npx prisma migrate dev --name init
```

Or via script:

```bash
npm run prisma:migrate -- --name init
```

5. Seed demo data

```bash
npm run db:seed
```

6. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000/decks](http://localhost:3000/decks)

## Use As App (PWA)

After deployment over HTTPS, the app can be installed on desktop/mobile:

- iPhone/iPad (Safari): `Share` -> `Add to Home Screen`
- Android (Chrome): menu -> `Install app` / `Add to Home screen`
- Desktop Chrome/Edge: install icon in address bar

Note:
- Local `http://localhost` works for testing service worker in development.
- Best install behavior appears on a deployed HTTPS URL.

## CSV Import Format

Headers:

```csv
front_text,back_text,image_url,tags,level
How are you?,A greeting,https://picsum.photos/seed/test/400/240,daily,1
```

Notes:

- `image_url`, `tags`, `level` are optional
- `level` should be an integer (1-10)
- `ReviewState` is created on first review (not on import)

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:studio`
- `npm run db:seed`

## Project Structure (key files)

- `app/decks/page.tsx` - deck list + create
- `app/decks/[deckId]/page.tsx` - deck details + cards
- `app/decks/[deckId]/add/page.tsx` - add card form
- `app/decks/[deckId]/today/page.tsx` - today counts
- `app/decks/[deckId]/review/page.tsx` - review page (server queue load)
- `components/ReviewClient.tsx` - client review flow
- `app/api/review-rate/route.ts` - apply rating
- `app/api/decks/[deckId]/review-queue/route.ts` - queue endpoint
- `app/api/decks/[deckId]/import/route.ts` - CSV import endpoint
- `lib/srs.ts` - `getTodayQueue` + `applyRating`
- `prisma/schema.prisma` - DB models
- `prisma/seed.ts` - demo deck seed

## Date Handling

- `dueDate` is stored as `DateTime`
- The app normalizes due dates to local midnight (`00:00`) for date-based comparisons
