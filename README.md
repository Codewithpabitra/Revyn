# Revyn — Server

AI-powered pull request reviewer. Connects to GitHub via a GitHub App, reviews PR diffs with an LLM, and posts inline review comments back to GitHub.

Live: https://revyn-server.onrender.com
Dashboard: https://revyn-dev.vercel.app

## How it works

1. GitHub sends a webhook when a PR is opened, synced, or reopened
2. The Fastify server verifies the webhook signature and enqueues a job (BullMQ + Redis)
3. A background worker picks up the job, fetches the diff via Octokit, and sends each file to Groq for review
4. The worker posts inline comments + a summary back to the PR via the GitHub API
5. Review metadata is saved to Postgres (Neon) for the dashboard to display

## Tech stack

- **Runtime**: Node.js + TypeScript
- **Server**: Fastify
- **Queue**: BullMQ + Redis
- **AI**: Groq (`openai/gpt-oss-120b`)
- **GitHub integration**: Octokit + GitHub App
- **Database**: PostgreSQL (Neon) via Prisma 7 (driver adapter: `@prisma/adapter-neon`)
- **Hosting**: Render

## Local setup

### Prerequisites
- Node.js 20+
- A GitHub App (see below)
- A Groq API key
- A Neon Postgres database
- Redis (Docker or local install)

### 1. Install dependencies
\`\`\`bash
npm install
npx prisma generate
\`\`\`

### 2. Environment variables

Create `.env`:
\`\`\`env
PORT=4000
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_PATH=./secrets/github-app-private-key.pem
GITHUB_WEBHOOK_SECRET=
GROQ_API_KEY=
DATABASE_URL=
REDIS_URL=redis://127.0.0.1:6379
\`\`\`

Place your GitHub App's downloaded `.pem` file at `./secrets/github-app-private-key.pem`.

### 3. GitHub App setup
- Create a GitHub App with **Contents: Read**, **Pull requests: Read & write**, **Checks: Read & write**
- Subscribe to the **Pull request** webhook event
- Set the webhook URL to your server's `/webhook` endpoint (use `ngrok` for local dev)
- Set the Setup URL to your dashboard's `/api/github/setup` endpoint

### 4. Run database migrations
\`\`\`bash
npx prisma migrate dev
\`\`\`

### 5. Run the app (two processes)
\`\`\`bash
npm run dev       # Fastify server (webhook receiver)
npm run worker    # background worker (AI review + GitHub posting)
\`\`\`

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/webhook` | POST | GitHub webhook receiver |
| `/health` | GET | Health check |
| `/api/installations` | POST | Register a Clerk user ↔ GitHub installation mapping |
| `/api/reviews` | GET | List review history for a user |

## Deployment

Deployed on Render as a single service running both the API and worker as child processes (see `src/index.ts`) due to free-tier limits on separate background workers. In production with more headroom, split into two Render services: a Web Service (`npm run start`) and a Background Worker (`npm run start:worker`).

Redis: hosted on Render's managed Key Value service. **Note**: set `maxmemory-policy` to `noeviction` — BullMQ requires this to avoid silent job data loss under memory pressure.

Private key: passed as the `GITHUB_APP_PRIVATE_KEY` env var (full PEM contents, not a file path) since the `.pem` file isn't present on the deployed filesystem.

## Guardrails

- Skips lockfiles, generated files, and binaries from AI review
- Skips diffs over ~8,000 characters rather than truncating (avoids feeding the model a broken patch)
- Deduplicates rapid-fire webhook events per PR using a deterministic BullMQ job ID