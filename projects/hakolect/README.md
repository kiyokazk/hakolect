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

> Docker binds the app to `127.0.0.1` only in the default compose file so the
> production path is: browser/client -> Caddy -> localhost:3000/8000.

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
- Basic Auth is also enforced at Caddy for `/api/hakolect/*`.

## API Key

`API_KEY` is set in `.env`. It is injected into the backend container as an env var. External clients (Chrome extension, OpenClaw integration) must pass it as `X-API-Key` header.

## Deployment (Production)

1. Set up a VPS and install Docker Compose + Caddy.
2. Point the DNS A record for `tool.terracek.com` to the VPS IP.
3. Copy `.env.example` to `.env`, set a strong `API_KEY`, and create a Caddy Basic Auth hash with `caddy hash-password`.
4. Copy `caddy-snippet.txt` into your Caddyfile and replace `<hashed_password>`.
5. Start the app with `docker compose up --build -d`.
6. Verify locally on the VPS:
   - `curl -I http://127.0.0.1:3000/hakolect/`
   - `curl http://127.0.0.1:8000/api/hakolect/health`
7. Verify through Caddy:
   - `curl -u '<basic-user>:<basic-pass>' https://tool.terracek.com/api/hakolect/health`
   - open `https://tool.terracek.com/hakolect/`

### Deployment notes

- `docker-compose.yml` binds ports to `127.0.0.1` only, so the app is exposed publicly through Caddy, not directly.
- Caddy proxies `/hakolect/*` to the frontend and `/api/hakolect/*` to the backend.
- If DNS is not ready yet, you can still validate the app locally on the VPS before switching traffic.

## DB Schema

- `bookmarks` — saved URLs with metadata and comments
- `folders` — hierarchical folder tree (self-referencing parent_id)
- `tags` — flat tag list (unique names)
- `bookmark_tags` — many-to-many join table
