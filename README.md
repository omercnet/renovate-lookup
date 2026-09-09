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

## Agent and API access

- `GET /llms.txt` gives agents a concise usage guide.
- `GET /openapi.json` returns the OpenAPI 3.1 contract.
- `GET /api` returns a small JSON discovery document.
- `POST /api` performs a lookup and returns `{ "renovateVersion": "...", "result": ... }`.

Example:

```sh
curl -sS http://localhost:3000/api \
  -H 'Content-Type: application/json' \
  -d '{"depName":"webpack","currentValue":"3.7.0","datasource":"npm"}'
```

`packageName` defaults to `depName`. Optional fields are `currentVersion`, `currentDigest`, `manager`, `versioning`, `rangeStrategy`, `registryUrls`, and `separateMinorPatch`. Unknown Renovate configuration is rejected rather than merged into server configuration.

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOOKUP_ALLOWED_REGISTRIES` | Comma-separated HTTPS origins accepted in `registryUrls`. Defaults to `https://registry.npmjs.org`. |

Credentials embedded in request URLs are discarded. Repository context and platform credentials are intentionally unsupported.

## Deployment

The project uses Bun for installs, local development, tests, and the static frontend build. The lookup engine runs in a Node.js 24 Vercel Function because Renovate officially targets Node.js. `bun run build` emits the frontend and agent discovery files to `dist`; `api/index.ts` serves `/api`.

Renovate is pinned exactly because this project calls internal `renovate/dist/**` modules. Dependency updates must pass `bun run check` and a real lookup smoke test.
