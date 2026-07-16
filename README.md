# Fusion Shop — TypeScript + PostgreSQL upgrade

This is a full rewrite of the original `WereHouse-Shop-Project` (React + Express + MongoDB)
onto TypeScript everywhere and PostgreSQL via Prisma. The original project is untouched —
this lives next to it so you can compare and cut over on your own schedule.

## What changed

- **Database:** MongoDB/Mongoose → PostgreSQL/Prisma. `Order.items` is now a real relational
  table (`OrderItem`) instead of an embedded array, and `Order.customer` is flattened into
  `customerName` / `customerPhone` / `customerAddress` / `customerNote` columns (the API still
  returns a nested `customer: {...}` object, so the frontend contract barely changed).
- **Money:** prices are stored as `Decimal(10,2)` instead of floating-point `Number`, which
  avoids rounding artifacts on totals. The API still serializes them as plain JS numbers.
- **IDs:** every resource now uses `id` instead of Mongo's `_id`. This is the one real breaking
  change to the API contract — see "Breaking changes" below.
- **Language:** both `server` and `client` are now TypeScript (`strict: true`). Request/response
  shapes are typed (`Product`, `Order`, `CartItem`, etc. in `client/src/types/index.ts`), and the
  client's repetitive `fetch` calls were consolidated into `client/src/lib/api.ts`.
- **Real inventory tracking, online card payments, and a stock revision tool** — see below.
  These are new on top of the original app, not just a port.

## New: real stock quantities

`Product.inStock` used to be a manually-toggled yes/no flag. It's now derived from a real
`stockQty` count (`inStock = stockQty > 0`), edited inline in Admin → Продукти or via the
product edit form.

Every order — cash-on-delivery or card — decrements stock atomically inside a database
transaction (`UPDATE ... WHERE id = ? AND stock_qty >= ?`), so two people buying the last unit
at the same time can't both succeed. Order creation also now looks up price/title from the
database instead of trusting whatever the client submitted, closing a price-tampering gap that
existed in the original app.

## New: Ревизия (stock revision / audit)

Admin → Продукти → "Ревизия" opens a page listing every product with its current system
quantity next to an editable "Преброено" (counted) field. Saving one:

- writes a `StockAudit` row (system qty, counted qty, difference, timestamp) — a permanent log
  of every count you've ever done
- reconciles `Product.stockQty` to the counted value

`GET /stock/audits` (admin) returns that history if you ever want to build a report on top of it.

## New: order email notifications (Gmail)

When a cash-on-delivery order comes in, the server emails the order details (customer, items,
total) to you via your own Gmail account, using [Nodemailer](https://nodemailer.com/). No email
is sent if `GMAIL_USER` / `GMAIL_APP_PASSWORD` aren't set — the order still goes through, you
just won't get a notification.

**Setup (you need to do this yourself):**

1. Turn on 2-Step Verification on the Google account you want to send from:
   https://myaccount.google.com/security
2. Generate an "App Password" at https://myaccount.google.com/apppasswords — pick any name
   (e.g. "Fusion Shop"), Google gives you a 16-character password. This is **not** your normal
   Gmail password and is the only thing that goes in `.env`.
3. In `server/.env`, set:
   - `GMAIL_USER` — the Gmail address you generated the app password for
   - `GMAIL_APP_PASSWORD` — the 16-character app password (spaces don't matter)
   - `ADMIN_NOTIFY_EMAIL` — where notifications should land (defaults to `GMAIL_USER` itself if
     left blank, so you can just leave it blank to email yourself)

Free Gmail accounts can send ~500 emails/day — a small shop sending one email per order is
nowhere near that limit.

The code lives in `server/src/lib/mailer.ts` (`sendNewOrderEmail`) — it's called from the order
route after the order is saved, wrapped so a mail failure never breaks order creation (it just
logs an error and moves on).

## Card payments (Stripe) — implemented, currently switched off

The backend fully supports card payments (Stripe Payment Element — card entry, Apple Pay,
Google Pay, Revolut Pay in one integration), but the checkout UI currently only offers
"Наложен платеж" — the card option was intentionally hidden for now. To bring it back:

- In `client/src/pages/Checkout.tsx`, restore the payment-method choice and `<CardPaymentForm>`
  wiring (removed but the component still exists at `client/src/components/CardPaymentForm.tsx`
  — check the project's earlier version, or ask to have it re-added).
- Nothing on the backend needs to change — `routes/orders.ts` (`/orders/card-intent`) and
  `routes/payments.ts` (the Stripe webhook) are untouched and ready to go.

**Setup, for whenever you turn it back on — Claude can't create accounts on your behalf:**

1. Create a Stripe account at https://dashboard.stripe.com/register (Bulgaria is supported).
2. Grab your API keys from https://dashboard.stripe.com/apikeys — the **secret key** (`sk_...`)
   goes in `server/.env` as `STRIPE_SECRET_KEY`, the **publishable key** (`pk_...`) goes in
   `client/.env` as `VITE_STRIPE_PUBLISHABLE_KEY`.
3. In https://dashboard.stripe.com/settings/payment_methods, enable the payment methods you
   want shoppers to see (Cards is on by default; toggle on Revolut Pay, Apple Pay, Google Pay).
4. Add a webhook endpoint at https://dashboard.stripe.com/webhooks pointing to
   `YOUR_SERVER_URL/webhooks/stripe`, listening for `payment_intent.succeeded` and
   `payment_intent.payment_failed`. Copy its signing secret into `server/.env` as
   `STRIPE_WEBHOOK_SECRET`.
5. For local development, install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
   `stripe listen --forward-to localhost:3000/webhooks/stripe` — it prints a `whsec_...` value,
   use that as your local `STRIPE_WEBHOOK_SECRET`.

If `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` are left blank, the site just runs with
cash-on-delivery only — the "Плащане с карта" option is disabled, not broken.

**How it works / a deliberate trade-off:** for a card order, the `Order` and Stripe
`PaymentIntent` are created together, but stock is only decremented once the webhook confirms
`payment_intent.succeeded` — not at checkout time. This means an abandoned card payment never
locks up inventory, at the cost of a small race window (two shoppers could both start paying for
the last unit). For a small shop this trade-off is the right one; a reservation/hold system would
close that gap but is real added complexity that isn't worth it at this scale.

## Breaking changes to be aware of

- API responses use `id` instead of `_id` everywhere (products, orders, order line items).
  If anything else talks to this API (a mobile app, a script, a Postman collection), update it.
- `Product.inStock` is no longer a field you can set directly via `PUT /products/:id` — set
  `stockQty` instead, `inStock` is derived and read-only in the API response.
- `GET /orders` and `GET /products` responses are otherwise the same shape (`{ items, total,
  page, limit, pages }`), now also including `paymentMethod` / `paymentStatus` on orders.
- Cart items persisted in `localStorage` from the old app use `_id`; the new app reads `id`.
  Existing visitors' carts will just appear empty once — not worth writing a migration for.

## Project structure

```
fusion-shop-ts/
  server/             Express + TypeScript + Prisma API
    prisma/
      schema.prisma    Product / Order / OrderItem / StockAudit models
      seed.ts           same 3 demo products as the old seedProduct.js
    scripts/
      migrate-from-mongo.ts   one-off Mongo -> Postgres data migration
    src/
      config/db.ts      Prisma client singleton
      middleware/        requireAdmin (JWT), errorHandler
      routes/            auth.ts, products.ts, orders.ts, stock.ts, payments.ts (Stripe webhook)
      lib/               serialize.ts (Decimal -> number), stripe.ts (lazy Stripe client)
  client/             Vite + React 19 + TypeScript SPA
    src/
      types/index.ts    shared Product/Order/CartItem/StockAudit types
      lib/               api.ts (typed fetch helpers), stripe.ts (loadStripe singleton)
      components/        CardPaymentForm.tsx (Stripe Payment Element) + the original components
      pages/              same pages as before (converted to .tsx) + AdminRevision.tsx
  docker-compose.yml  local Postgres for development
```

## Local setup

### 1) Database

Easiest path — spin up Postgres with Docker:

```bash
docker compose up -d
```

This gives you `postgresql://postgres:postgres@localhost:5432/fusion_shop`, which matches
`server/.env.example`. If you'd rather use a managed Postgres (Render, Railway, Supabase,
Neon...), just point `DATABASE_URL` at that instead.

### 2) Server

```bash
cd server
cp .env.example .env      # fill in ADMIN_USER / ADMIN_PASS / JWT_SECRET (Gmail/Stripe vars optional)
npm install
npm run prisma:migrate    # creates tables (asks for a migration name, e.g. "init")
npm run seed               # optional: adds 3 demo products
npm run dev                 # http://localhost:3000
```

### 3) Client

```bash
cd client
cp .env.example .env      # VITE_STRIPE_PUBLISHABLE_KEY optional — see the Stripe section above
npm install
npm run dev                 # http://localhost:5173
```

### 4) Migrating your real data from MongoDB

If you have real products/orders in the old Mongo database (not just the demo seed), run the
one-off migration script instead of / before `npm run seed`:

```bash
cd server
npm install --no-save mongoose
MIGRATE_MONGO_URI="<your old MONGO_URI>" npm run migrate:mongo
```

It copies every product and order across, preserving the original Mongo `_id` values as the new
Postgres `id` (safe, since Prisma's `id` here is a plain text column) so order-to-product
references keep working without any remapping. The old app never tracked real quantities, so
in-stock products get migrated with a starting `stockQty` of 10 (override with
`MIGRATE_DEFAULT_STOCK_QTY=<n>`) — do a real count via the new "Ревизия" page right after.
See the comment at the top of the script for details.

## Deploying

Same shape as before (e.g. Render): a web service for `server` (`npm run build && npm run
prisma:deploy` then `npm start`) plus a managed Postgres instance, and a static site for
`client` (`npm run build`, publish `client/dist`, keep `client/public/_redirects` for
SPA routing). Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USER`/`ADMIN_PASS`, `CORS_ORIGIN`
(comma-separated allowed origins — the old server used `origin: "*"`, which works but is worth
locking down once you know your frontend's URL), the `GMAIL_*` vars (for order emails), and the
`STRIPE_*` vars (if/when card payments are turned back on) on the server, and `VITE_API_URL` /
`VITE_STRIPE_PUBLISHABLE_KEY` on the client. Don't forget to point the Stripe webhook at your
real deployed server URL once it's live.

## Suggested next steps (not done here, since they'd change behavior/deployment)

- Hash `ADMIN_PASS` with bcrypt instead of comparing plaintext env vars — low effort, meaningfully
  better if the `.env` ever leaks.
- Add Zod (or similar) request validation on the route handlers instead of the current manual
  `if (!x) return 400` checks — mostly a maintainability win.
- Consider image uploads going to S3/Cloudinary rather than raw `imageUrl` strings, if you want
  the admin panel to accept file uploads instead of pasted links.
