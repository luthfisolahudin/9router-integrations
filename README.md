# 9Router integrations

Canonical local integrations for the 9Router model catalog and thinking-effort
policy shared by OpenCode, standalone Pi, and tt Pi.

## Entrypoints

- `plugins/opencode.ts` configures OpenCode from the live `/v1/models` response.
- `extensions/pi.ts` registers Pi's OpenAI Chat Completions-compatible provider at `<router-root>/v1`.
- `src/catalog.ts` owns discovery and exact catalog validation.
- `src/effort.ts` owns the measured model-to-wire-effort mapping.

Consumers load these TypeScript entrypoints directly from this repository. No
package publication or runtime dependency installation is required.

The catalog serves no display names, so `displayName()` in `src/catalog.ts`
derives picker labels locally: `cbcn/kimi-k3` shows as `Kimi K3 (CodeBuddy CN)`.
Model IDs remain the canonical key everywhere else. Catalog discovery remains at
`<router-root>/v1/models`, while OpenCode and Pi use `<router-root>/v1` as their
OpenAI-compatible API base.

Pi starts offline with DeepSeek V4 Flash and the tt-pinned GPT 5.6 Terra
fallback. Terra is a reasoning, text-and-image model with a 272,000-token
context window and 128,000-token output limit. A successful catalog refresh
replaces those fallbacks with the exact live membership.

## Checks

```sh
pnpm check
```

Live effort evidence and the re-probe rule are recorded in
[`docs/EFFORT_MATRIX.md`](docs/EFFORT_MATRIX.md).
