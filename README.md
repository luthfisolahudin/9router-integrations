# 9Router integrations

Canonical local integrations for the 9Router model catalog and thinking-effort
policy shared by OpenCode, standalone Pi, and tt Pi.

## Entrypoints

- `plugins/opencode.ts` configures OpenCode from the live `/v1/models` response.
- `extensions/pi.ts` registers Pi's OpenAI Chat Completions-compatible provider at `<router-root>/v1`.
- `src/catalog.ts` owns discovery and exact catalog validation.
- `src/effort.ts` owns the measured model-to-wire-effort mapping.
- `src/capabilities.ts` projects raw capability flags into the shared view both
  client integrations read.
- `src/check-report.ts` is the pure analysis behind `pnpm check:catalog`; the
  script only fetches, prints, and sets the exit code.
- `src/invariants.ts` owns curated capability ground truth.

Consumers load these TypeScript entrypoints directly from this repository. No
package publication or runtime dependency installation is required.

The catalog serves no display names, so `displayName()` in `src/catalog.ts`
derives picker labels locally: `cbcn/kimi-k3` shows as `Kimi K3 (CodeBuddy CN)`.
Model IDs remain the canonical key everywhere else. Catalog discovery remains at
`<router-root>/v1/models`, while OpenCode and Pi use `<router-root>/v1` as their
OpenAI-compatible API base.

Pi starts offline with DeepSeek V4.1 Flash and the tt-pinned GPT 5.6 Terra
fallback. Terra is a reasoning, text-and-image model with a 272,000-token
context window and 128,000-token output limit. A successful catalog refresh
replaces those fallbacks with the exact live membership.

## Checks

```sh
pnpm check
pnpm check:catalog
```

`pnpm check` typechecks every project file (including `test/`) and runs the
unit test suite. The tests cover catalog parsing for every envelope shape, URL
and env-variable resolution, display-name rendering, both client projections,
capability invariants, the capability view, and the check report itself; they
stub the network via `globalThis.fetch`, so they run without a live router.

`pnpm check:catalog` fetches the live catalog, exercises both client
projections, verifies curated capability invariants, and fails when a new
reasoning model has no measured wire-effort entry. Runtime integrations keep
that model visible without forcing an unverified effort while the measurement
is pending. Pass `pnpm check:catalog --allow-unmeasured` when checking
projection compatibility without requiring the effort table to be complete, or
`--allow-stale` while pruning effort entries for retired models.

The capability invariants in `src/invariants.ts` are the independent source of
truth for externally verifiable facts (for example, that
`cbcn/deepseek-v4.1-flash` is natively multimodal). They catch a router
capability regression that the projections alone cannot: a wrong `vision` flag
silently drops image input without throwing, so `check:catalog` would otherwise
pass.

Live effort evidence and the re-probe rule are recorded in
[`docs/EFFORT_MATRIX.md`](docs/EFFORT_MATRIX.md).
