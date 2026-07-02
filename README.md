# Aurora DealFlow

Property data + AI deal scoring + CRM for real estate investors.

## Stack

- **Monorepo**: pnpm + Turborepo
- **Web**: Next.js 15, Tailwind
- **API**: Express + tRPC
- **Auth**: JWT (email/password, bcrypt + jsonwebtoken)
- **Database**: Postgres + PostGIS, Drizzle ORM
- **Integrations**: ATTOM (property data), OpenAI (AI summaries), Mapbox (maps)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Postgres

```bash
docker compose up -d
```

Postgres runs on port **5434** by default (to avoid conflicts with a local Postgres on 5432).

### 3. Configure environment

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://aurora:aurora@localhost:5434/aurora_dealflow
JWT_SECRET=change-this-to-a-long-random-secret-at-least-32-characters
PORT=4001
WEB_ORIGIN=http://localhost:3001
ATTOM_USE_DEMO=true
OPENAI_USE_DEMO=true
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
```

See `.env.example` for all variables.

### 4. Run migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development

```bash
pnpm dev
```

- Web: http://localhost:3000 (or set `PORT=3001` if 3000 is taken)
- API: http://localhost:4000 (or set `PORT=4001`)

### 6. Create an account

Open `/login` to sign up with email and password. JWT tokens are stored in the browser and sent as `Authorization: Bearer <token>` to the API.

## Demo Mode

When ATTOM/OpenAI keys are missing, the app uses built-in demo properties (Springfield IL, Albuquerque NM, etc.) so you can test the full flow without API credentials.

## Project Structure

```
apps/
  web/     Next.js frontend
  api/     Express + tRPC server
  mobile/  Expo field companion app
packages/
  core/          Scoring engine + shared types
  db/            Drizzle schema + migrations
  integrations/  ATTOM, OpenAI, comms, Stripe (demo stubs)
  trpc/          tRPC routers + JWT auth
```

## Milestones Implemented

- **M1**: Auth, property search, map, filters, property profile, save-as-lead
- **M2**: Deterministic opportunity score, AI summary, strategy recommendation, sort/filter by score
- **M3**: CRM pipeline board, tasks, notes, activity timeline, lead assignment, Expo mobile v1
- **M4**: Demo SMS/email comms, unified conversation thread, AI call scripts, skip trace placeholder, campaign auto-pause on reply
- **M5**: Campaign engine, 5 prebuilt playbooks, bulk enrollment, throttled sequence processor, campaign analytics
- **M6**: Deal rooms (MAO calculator, checklist, docs), cash buyer database + buy boxes, buyer matching, demo Stripe billing, usage limits, admin panel

## New Dashboard Routes

| Route | Feature |
|-------|---------|
| `/dashboard/pipeline` | Kanban-style pipeline |
| `/dashboard/campaigns` | Campaign playbooks |
| `/dashboard/deals` | Deal rooms |
| `/dashboard/buyers` | Cash buyer CRM |
| `/dashboard/settings/billing` | Plans & usage |
| `/dashboard/admin` | Admin stats (requires `ADMIN_EMAILS`) |

## Mobile App

```bash
cd apps/mobile
pnpm dev
```

Set `EXPO_PUBLIC_API_URL=http://localhost:4001` (use your machine IP for physical devices).

## Deploy to Fly.io

Production deploys use two Fly apps (API + Web) and a Fly Postgres cluster.

```bash
chmod +x scripts/deploy-fly.sh
./scripts/deploy-fly.sh
```

This creates:

- **API**: `https://aurora-dealflow-api.fly.dev`
- **Web**: `https://aurora-dealflow-web.fly.dev`
- **Postgres**: managed Fly Postgres cluster

Manual deploy:

```bash
fly deploy --config fly.api.toml --app aurora-dealflow-api
fly deploy --config fly.web.toml --app aurora-dealflow-web \
  --build-arg NEXT_PUBLIC_API_URL=https://aurora-dealflow-api.fly.dev
```

Set secrets on the API app (`JWT_SECRET`, `WEB_ORIGIN`, integration keys) via `fly secrets set`.
