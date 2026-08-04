# Aurora DealFlow — 10-minute stakeholder demo

## Story

One workspace: **source inventory → work the lead → underwrite → dispo to matched buyers**.

## Checklist (Loom asks)

- [ ] Search does **not** feel like PropStream (charcoal/amber Command UI, right results dock, Opportunity Modes)
- [ ] Pipeline stages move with **drag-and-drop** (no dropdown required)
- [ ] Marketplace shows **blurred teaser**; full address after buyer join / unlock
- [ ] Buyer onboarding captures **buy box** + SMS consent
- [ ] Deal Room → **Publish** + **Blast** matched buyers (Twilio/Resend or demo audit)
- [ ] Billing shows Free / Pro ($99) / Team ($199) / Scale ($399)

## Script (~10 min)

1. **Landing (30s)** — Open `/`. Point at Acquire + Dispo wedges and pricing.
2. **Search (2 min)** — `/dashboard/search`. ZIP search. Open Filters → Opportunity Modes. Note stub labels on auction/tax modes. Results dock on the right.
3. **Lead → Pipeline (2 min)** — Save a lead. Open Pipeline. Drag a card across stages.
4. **Deal Room (2 min)** — Open deal, set ARV/repairs, publish to marketplace (accept disclaimer).
5. **Marketplace gate (2 min)** — Incognito `/marketplace`. Show blurred address. Join as buyer with buy box + consent. Unlock listing.
6. **Blast (1 min)** — Back in Deal Room → Blast matched buyers. Show sent count / demo provider note.
7. **Billing (30s)** — Settings → Billing. Mention Scale plan for marketplace volume.

## Env for live providers

| Secret | Purpose |
|--------|---------|
| `CREDENTIALS_ENCRYPTION_KEY` | Encrypt BYO Twilio tokens at rest (else `JWT_SECRET`) |
| User BYO Twilio (Settings → Integrations) | Preferred: Account SID + Auth Token + From number |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Optional platform SMS fallback |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Email blasts |
| `STRIPE_SECRET_KEY` + plan `stripe_price_id` | Live checkout |
| `ATTOM_API_KEY` / `MAPBOX_TOKEN` | Search + map |

Without BYO Twilio or platform Twilio/Resend/Stripe keys, providers log **demo** sends and still write blast audit rows.

Demo tip: Settings → Integrations → save Twilio → Test SMS → lead Communications one-click follow-ups / send to buyers.

## Deploy

```bash
# migrate + seed locally
pnpm --filter @aurora/db migrate
pnpm --filter @aurora/db seed

# Fly (example)
fly deploy -c apps/api/fly.toml
fly deploy -c apps/web/fly.toml
```

Set Fly secrets for ATTOM, Mapbox (build arg), Twilio, Resend, Stripe, `DATABASE_URL`, `JWT_SECRET`, `APP_URL`.
