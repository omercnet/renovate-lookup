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

Optional fields are `packageName`, `currentVersion`, `currentDigest`, `manager`, `versioning`, `rangeStrategy`, `registryUrls`, and `separateMinorPatch`. Unknown Renovate configuration is rejected rather than merged into server configuration.

`GET /api` returns the installed Renovate version.

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOOKUP_ALLOWED_REGISTRIES` | Comma-separated HTTPS origins accepted in `registryUrls`. Defaults to `https://registry.npmjs.org`. |

Credentials embedded in request URLs are discarded. Repository context and platform credentials are intentionally unsupported.

## Deployment

The project uses Bun for installs, local development, tests, and the static frontend build. The lookup engine runs in a Node.js 24 Vercel Function because Renovate officially targets Node.js. `bun run build` emits the frontend to `dist`; `api/index.ts` serves `/api`.

Renovate is pinned exactly because this project calls internal `renovate/dist/**` modules. Dependency updates must pass `bun run check` and a real lookup smoke test.
