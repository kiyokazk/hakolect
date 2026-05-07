# Hakolect

Personal bookmark manager — a self-hosted, single-user web app for saving, organizing, and searching bookmarks.

## What is Hakolect?

Hakolect lets you save URLs with automatic metadata fetching (title, description, OGP image, favicon), organize them into folders, tag them, and search across everything. It's designed for one person's use, secured by Basic Auth at the reverse proxy layer.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Proxy | Caddy (Basic Auth) |
| Deploy | Docker Compose |

## Quick Start

```bash
# Copy and edit env vars
cp .env.example .env
# Edit .env: set a strong API_KEY

# Build and start
docker compose up --build -d

# Web UI: http://localhost:3000/hakolect/
# API:    http://localhost:8000/api/hakolect/v1/
```

## Demo Data

```bash
cd backend
source .venv/bin/activate
DATABASE_URL=sqlite:///$(pwd)/data/hakolect.db python seed_demo.py
```

This inserts demo folders, tags, and bookmarks for local screenshots and interaction checks.

## Dev Mode

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit DATABASE_URL to: sqlite:///./data/hakolect.db
mkdir -p data
uvicorn app.main:app --reload --port 8000
```

### Seed demo data (optional — for local testing)

```bash
# From backend/ with venv active:
python seed_demo.py
```

Inserts 4 folders and 13 bookmarks. Safe to run only once — skips if data already exists.
To reset: delete `data/hakolect.db` and re-run.

### Frontend

```bash
cd frontend
npm install
# Copy env template for local dev (points directly at localhost:8000)
cp .env.local.example .env.local
npm run dev
# Optional: seed demo data
DATABASE_URL=sqlite:///$(pwd)/data/hakolect.db python seed_demo.py

# Visit: http://localhost:5173/hakolect/
```

> **Note:** `.env.local` sets `VITE_API_BASE_URL=http://localhost:8000/api/hakolect/v1` so the
> frontend talks directly to the backend without needing the Docker network proxy.

## Paths

| Purpose | Path |
|---------|------|
| Web UI | `/hakolect/` |
| API base | `/api/hakolect/v1` |
| Health check | `GET /api/hakolect/health` |

## Auth

**Browser access (Web UI)**
- Protected by HTTP Basic Auth at the Caddy proxy layer.
- No app-level auth — the app trusts that Caddy has authenticated the user.
- Configure in `caddy-snippet.txt`.

**External API access (OpenClaw, Chrome extension)**
- Pass `X-API-Key: <your key>` request header.
- The key must match `API_KEY` in `.env`.
- Basic Auth is still enforced at Caddy, but `X-API-Key` is the machine-readable credential.

## API Key

`API_KEY` is set in `.env`. It is injected into the backend container as an env var. External clients (Chrome extension, OpenClaw integration) must pass it as `X-API-Key` header.

## Deployment (Production)

1. Set up a VPS and install Docker + Caddy.
2. Point DNS A record for `tool.terracek.com` to the VPS IP (DNS management is out of scope for this codebase).
3. Copy `caddy-snippet.txt` contents into your Caddyfile.
4. Run `docker compose up -d`.

## DB Schema

- `bookmarks` — saved URLs with metadata and comments
- `folders` — hierarchical folder tree (self-referencing parent_id)
- `tags` — flat tag list (unique names)
- `bookmark_tags` — many-to-many join table
