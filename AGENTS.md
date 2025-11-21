# Repository Guidelines

## Project Structure & Module Organization
- `src/` – FastAPI backend organized by domain: `api/` (routes), `db/` (models + session), `news/` (external fetcher), `streaming/` (WebSocket dispatcher), `schemas/`, `config.py`, `util.py`, `vault.py`, and `test/`.
- `web/` – Next.js frontend with `app/` (App Router), `components/`, `hook/`, `api/` (client utilities), `config/`, `messages/`, `providers/`, `i18n/`, `public/`, and `middleware.tsx`.
- `docker-compose.yml`, `.env`, `.env.example` – shared runtime configuration.

## Build, Test, and Development Commands
- **Backend local run:** `poetry install && poetry run uvicorn src.main:app --reload` – hot-reloads API against local Postgres.
- **Backend tests:** `poetry run pytest` – executes async/unit suites under `src/test/`.
- **Frontend dev server:** `cd web && pnpm install && pnpm dev` – launches Next.js on `localhost:3000`.
- **Frontend lint/build:** `pnpm lint` for ESLint, `pnpm build` for production bundle.
- **Full stack via Docker:** `docker compose up --build` – starts Postgres, FastAPI (`api`), and Next.js (`web`).

## Coding Style & Naming Conventions
- Python uses `black`-compatible 4-space indent, snake_case modules/functions (`db/session.py`, `normalize_symbol`). Stick to type hints and pydantic models for payloads.
- TypeScript/React favors functional components and hooks under `app/` + `hook/`. Use PascalCase for components (`TickerSelector`), camelCase for hooks/functions, and alias imports via `@/`.
- ESLint (Next.js config) enforces frontend style; rely on Poetry-managed dependencies for backend consistency.

## Testing Guidelines
- Backend tests live in `src/test/`. Name files `test_*.py` and leverage `pytest`/`pytest-asyncio` for async flows.
- Future frontend tests should use React Testing Library under `web/__tests__/` or colocated `*.test.tsx`.
- Run `poetry run pytest` and `pnpm test` (when added) before raising PRs; target meaningful coverage around API contracts and WebSocket behavior.

## Commit & Pull Request Guidelines
- Commit messages should be imperative and scoped (e.g., `feat(api): add symbol normalization`). Group related changes per commit when possible.
- Pull requests must describe the change, detail testing (`pytest`, `pnpm build`, `docker compose up`), and link any tracking issues. Include screenshots or GIFs for UI updates, especially changes in `web/app` or `web/components`.

## Security & Configuration Tips
- Never commit secrets; edit `.env` locally and keep `.env.example` synced.
- `FINNHUB_API_KEY` gates real data—without it, the mock feed runs. Confirm CORS origins via `ALLOWED_ORIGINS` when deploying beyond localhost.
