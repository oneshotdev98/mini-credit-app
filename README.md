# Mini Credit Application

A small **Next.js** app for B2B **credit applications**: vendors create drafts, email a secure link to applicants, collect a full submission, optionally get an **AI-assisted advisory summary**, and record an underwriting **decision**. Data lives in **PostgreSQL** via **Drizzle ORM**.

---

## Features

- **Vendor flow**: create applications (build form or upload a document to pre-fill), edit drafts, copy apply links, send email to the applicant.
- **Applicant flow**: tokenized `/apply/[token]` form; strict validation on submit.
- **Document upload**: PDF / DOCX / text extraction, then structured field extraction (see **AI** below).
- **AI advisory** (optional): after an application is **submitted**, generates a short JSON-backed summary for the vendor (stance, headline, bullets)—advisory only, not a binding decision.
- **Apollo** (optional): company lookup to help pre-fill fields on the apply page when `APOLLO_API_KEY` is set.
- **Email**: Nodemailer + SMTP for applicant invites and vendor notifications.

---

## Approach: AI (Groq)

The app uses **[Groq](https://groq.com/)**’s **OpenAI-compatible Chat Completions API** (`https://api.groq.com/openai/v1/chat/completions`). No separate “Groq SDK” is required—plain `fetch` with a bearer API key.

| Use case | When it runs | Behaviour if `GROQ_API_KEY` is missing |
|----------|----------------|------------------------------------------|
| **Upload parse** | `POST /api/upload-parse` after text is extracted from the file | Falls back to a small **regex-based** parser (limited fields). |
| **AI advisory** | After status is **submitted** (e.g. from application detail / refresh) | Card shows that AI is not configured; no server error. |

**Default model** (both flows): **`llama-3.1-8b-instant`**.

Override with **`GROQ_MODEL`** if you want another Groq-supported chat model ID (see [Groq docs](https://console.groq.com/docs/models)).

- Upload parse uses **`response_format: { type: "json_object" }`** when the model supports it; otherwise it retries without that flag.
- Advisory uses a fixed system prompt and expects **strict JSON** (stance, headline, bullets, adjustmentNote) parsed server-side.

---

## PDF and server runtime

- Text is extracted with **`pdfjs-dist`** on the **Node** runtime (including Vercel).
- Node does not provide **`DOMMatrix`**; the app loads **`@thednp/dommatrix`** as a polyfill before importing PDF.js (see `lib/pdfjs-node-polyfill.ts`).
- **DOCX** text uses **mammoth**. Legacy **.doc** is not supported (user is asked to export to PDF or DOCX).

---

## Prerequisites

- **Node.js** **≥ 20.16** (required by `pdfjs-dist`; use 20 LTS or 22+).
- **pnpm** (recommended; lockfile is pnpm).
- A **PostgreSQL** database (local Docker, Neon, RDS, etc.).

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Create a **`.env`** in the project root (never commit real secrets). Example shape:

```bash
# Database (required)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

# Public URL of the app (used in emailed links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Groq (optional but recommended for upload AI parse + advisory)
GROQ_API_KEY=gsk_...
# Optional override; default is llama-3.1-8b-instant
# GROQ_MODEL=llama-3.1-8b-instant

# SMTP (optional; needed to send apply links / notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
# Use 465 with implicit TLS, or set explicit flag:
# SMTP_SECURE=true
MAIL_FROM="Mini Credit <noreply@example.com>"
VENDOR_NOTIFICATION_EMAIL=you@example.com

# Apollo (optional; company search on apply flow)
# APOLLO_API_KEY=
```

### 3. Database schema

Apply migrations to your Postgres instance:

```bash
pnpm db:migrate
```

For a quick local schema sync (e.g. empty dev DB), you can use:

```bash
pnpm db:push
```

Schema and migrations live under `db/` and `drizzle/`.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Production build

```bash
pnpm build
pnpm start
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migrations from `db/schema.ts` |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to DB (dev-friendly) |
| `pnpm db:studio` | Drizzle Studio |

---

## Deploying (e.g. Vercel)

- Set the same **environment variables** in the project settings (especially `DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`, `GROQ_API_KEY` if you want AI).
- Use a **serverless-friendly Postgres** (connection pooling / Neon recommended).
- Ensure **Node ≥ 20.16** in project settings so PDF extraction works.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Groq API (OpenAI-compatible)](https://console.groq.com/docs/openai)
