# 9Router integrations

Canonical local integrations for the 9Router model catalog and thinking-effort
policy shared by OpenCode, standalone Pi, and tt Pi.

## Entrypoints

- `plugins/opencode.ts` configures OpenCode from the live `/v1/models` response.
- `extensions/pi.ts` registers Pi's Anthropic Messages-compatible provider.
- `src/catalog.ts` owns discovery and exact catalog validation.
- `src/effort.ts` owns the measured model-to-wire-effort mapping.

Consumers load these TypeScript entrypoints directly from this repository. No
package publication or runtime dependency installation is required.

## Checks

```sh
pnpm check
```

Live effort evidence and the re-probe rule are recorded in
[`docs/EFFORT_MATRIX.md`](docs/EFFORT_MATRIX.md).
