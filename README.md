# Renovate Lookup

A small web UI for running Renovate datasource lookups directly. It shows the same update candidates Renovate sees without creating a repository or waiting for a bot run.

## Run locally

Requires Bun 1.4.

```sh
bun install
bun run dev
```

Open <http://localhost:3000>. The development server hot-reloads the TypeScript and CSS frontend and serves the API from the same origin.

```sh
bun run check
```

`check` runs Biome with warnings treated as errors, strict TypeScript checking, Bun tests, and the production frontend build. Use `bun run lint:fix` to apply safe lint and import fixes, or `bun run format` for formatting only.

## API

`POST /api` accepts JSON:

```json
{
  "depName": "webpack",
  "currentValue": "3.7.0",
  "datasource": "npm"
}
```

Optional fields are `packageName`, `currentVersion`, `currentDigest`, `manager`, `versioning`, `rangeStrategy`, `registryUrls`, `repository`, and `separateMinorPatch`. Unknown Renovate configuration is rejected rather than merged into server configuration.

`GET /api` returns the installed Renovate version.

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOOKUP_ALLOWED_REGISTRIES` | Comma-separated HTTPS origins accepted in `registryUrls`. Defaults to `https://registry.npmjs.org`. |
| `LOOKUP_ENABLE_REPOSITORY=true` | Enables repository-aware lookup. Disabled by default. |
| `RENOVATE_TOKEN` | Platform token required for repository-aware lookup. Never accepted from the request. |
| `RENOVATE_PLATFORM` | Fixed platform used for repository-aware lookup. |

Registry credentials belong in server-side Renovate host rules. Credentials embedded in request URLs are discarded.

## Deployment

The project targets Vercel's Bun 1.4 runtime. `bun run build` emits the static frontend to `dist`; `api/server.ts` is the Bun function behind `/api`.

Renovate is pinned exactly because this project calls internal `renovate/dist/**` modules. Dependency updates must pass `bun run check` and a real lookup smoke test.
