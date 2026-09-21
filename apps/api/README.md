# Bloomley API

FastAPI backend for Bloomley. The application is organized by business domain (Screaming Architecture); add domain modules as features are introduced.

## Local development

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The API is available at <http://localhost:8000>. Health check: <http://localhost:8000/health>.

## Migrations

Start Postgres from the repository root, then run:

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
```
