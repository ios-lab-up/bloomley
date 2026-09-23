# Bloomley

Gamified wellness AI application monorepo.

## Repository structure

```text
apps/
├── mobile/   # Expo + React Native mobile application
└── api/      # FastAPI + SQLModel backend

docker-compose.yml  # Local PostgreSQL and Adminer services
```

The API follows **Screaming Architecture**: business-domain modules will be added as siblings of `apps/api/app/core/` as features are built. The initial scaffold contains shared configuration, database infrastructure, a health endpoint, and Alembic migration support.

## Prerequisites

- Node.js (LTS recommended)
- pnpm
- Python 3.14+
- [uv](https://docs.astral.sh/uv/)
- Docker with Docker Compose

## Configuration

Each app owns its environment file:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

The development defaults are safe for local use. Do not commit `.env` files.

## Run the database and Adminer

```bash
docker compose up -d db adminer
```

- PostgreSQL: `localhost:5432`
- Adminer: <http://localhost:8080>
  - System: PostgreSQL
  - Server: `db`
  - Username: `bloomley`
  - Password: `bloomley`
  - Database: `bloomley`

If 5432/8080 are already taken by another project on your machine, don't edit `docker-compose.yml` -- copy `docker-compose.override.yml.example` to `docker-compose.override.yml` (gitignored) and remap the host ports there. Docker Compose loads it automatically. Remember to also point your local `apps/api/.env`'s `DATABASE_URL` at whatever host port you chose.

## Run the API

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload
```

API: <http://localhost:8000>  
Health check: <http://localhost:8000/health>  
OpenAPI docs: <http://localhost:8000/docs>

Run migrations after starting PostgreSQL:

```bash
uv run alembic upgrade head
```

To run the API in Docker instead:

```bash
docker compose up --build api
```

## Run the mobile app

```bash
cd apps/mobile
pnpm install
pnpm start
```

Use the Expo CLI prompts to open the app on an iOS simulator, Android emulator, or a physical device. `EXPO_PUBLIC_API_URL` is defined in `apps/mobile/.env` for future API integration.

## Stop local services

```bash
docker compose down
```

Add `--volumes` when you also want to remove the local PostgreSQL data volume.
