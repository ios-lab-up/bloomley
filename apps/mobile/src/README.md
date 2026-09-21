# FSD layers (import only downward)

screens -> features -> entities -> shared

- `app/` (repo root): expo-router routes only. Each file re-exports a screen from `src/screens`.
- `src/app/`: providers, global config.
- `src/screens/<name>/`: composes features + entities.
- `src/features/<name>/`: one user action.
- `src/entities/<name>/`: domain model + api + card UI. Mirrors backend modules.
- `src/shared/`: ui kit, api client, hooks. No business logic.

Each slice exposes `index.ts` as its public API. Alias: `@/` = `src/`.
