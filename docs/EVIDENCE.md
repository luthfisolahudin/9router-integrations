# Evidence log — 9Router

The measured evidence for this provider lives in
[`EFFORT_MATRIX.md`](EFFORT_MATRIX.md): how each effort mapping was observed in the
router's `THINK:<level>` request log, plus the capability invariants and the
re-probe rule.

## Why the router log is the evidence

`packages/cli` probes a remote endpoint by comparing reasoning-token counts, which
is a weak signal. 9Router is local and logs the value it actually forwarded, so a
mapping here is a direct observation rather than an inference. That is the whole
difference between a `measured` entry and a `models.dev` declaration.

## Catalog observations

- Every model reports `capabilities.reasoning: true` and
  `capabilities.thinkingRange: null`, so the declared levels never come from the
  catalog; they come from the effort matrix.
- `capabilities.tools` is always present, so the pack does not need a fallback for
  tool support.
- The live catalog changes with the router's connection set: a model can disappear
  because a connection was removed, not because the router no longer supports it.
  `task check:catalog` reports absent invariants instead of failing, which is how
  curation stays visible.

## Never used

- `thinkingRange` (always null) and the router's own display names (it serves none).
