# ReCircuit — PRD

## Original problem statement
PS ID: Open Innovation · Title: Digitalizing the Informal E-Waste Recycling System · Theme: Clean & Technology · Team: The Null Set.
Build an app interface with a solid-color bento grid + glassmorphism mix, using the React Bits CountUp component on a loading page, with a working database login. Merge the two reference videos' UI (dark #111 landing w/ white pill CTAs + bento cards; dark charcoal dashboard w/ lime accent, sidebar nav, KPI cards, area chart) with the backend structure from the PPT (6 steps: Capture → Categorize → Value → Match → Handover → Payment).

## User choices
- Roles: Collector + Recycler + Admin (admin is the only one with access to all logs)
- Auth: JWT email/password stored in MongoDB
- Categorize / Value: rule-based price table (no API keys)
- Payments: Stripe (INR) — Flow B via emergentintegrations with pod `STRIPE_API_KEY` (claimable sandbox unavailable: country IN not supported)
- Loading page: PS meta + CountUp stats (kg recycled, collectors, ₹ paid out)

## Architecture
- Frontend: React 19, react-router 7, Tailwind (custom tokens ink/coal/ash/acid/forest, Outfit + DM Sans), framer-motion, motion (CountUp), recharts, sonner
- Backend: FastAPI (`server.py`, `auth.py`, `routes.py`, `pricing.py`, `seed.py`, `storage.py`, `models.py`, `db.py`), PyJWT + bcrypt, motor/MongoDB
- Storage: Emergent Object Storage for listing photos (served via `/api/files/{path}?auth=token`)
- Payments: Stripe Checkout (INR) via emergentintegrations; webhook `/api/webhook/stripe`; polling `/api/payments/status/{session_id}`

## User personas
- Collector (kabadiwala / scrap collector): lists lots, gets price estimate, receives wallet credits, confirms handover
- Recycler: browses open lots, matches, pays via Stripe, confirms handover
- Admin: network KPIs, 14-day kg chart, full activity logs, users list

## Core requirements (static)
1. Splash/loading page with CountUp stats + PS/team meta → auto-redirect to landing
2. Landing: glass nav, hero, 6-step bento grid, architecture grid, impact stats, footer
3. JWT auth with 3 roles; admin seeded from .env; brute-force lockout
4. Collector wizard: Capture (photo upload) → Categorize (rule engine) → Value (₹ estimate) → publish
5. Recycler marketplace: match → Stripe pay → handover code
6. Wallet/ledger credited on payment; admin logs of everything

## Implemented (2026-06)
- All of the above; seeded demo data (admin, collector, recycler, 10 lots); tested 25/25 backend + all frontend flows (test_reports/iteration_1.json)
- Iteration 2: Razorpay payment option (order/verify/webhook wired, keys pending in .env → 503 + UI notice), Leaflet/OSM map matching (listing lat/lng picker, recycler facility location, distance-sorted lots, /api/map), AI photo categorization (GPT-5.4 Mini via Emergent LLM key, POST /api/categorize/photo). Tested 19/19 backend + all frontend flows (test_reports/iteration_2.json)

## Backlog
- P1: Add real Razorpay test keys (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET) and verify live checkout
- P1: Notifications on match & payment (email/SMS)
- P2: Admin listing moderation, pagination on logs/users, CSV export
- P2: Collector wallet withdrawal / payout request flow

## Credentials
See /app/memory/test_credentials.md
