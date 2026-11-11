# 9Router integrations

Live model discovery and OpenAI Chat Completions for [9Router](https://github.com/luthfisolahudin/9router),
shared by Pi and OpenCode. The catalog is read from the router at
`http://127.0.0.1:20128/v1/models`; no model list is maintained by hand.

Built on [`ai-provider-integrations-template`](https://github.com/luthfisolahudin/ai-provider-integrations-template):
the engine, both adapters, the checks and the docs come from there, and this repo
owns only the 9Router surface.

## What this repo owns

| Path | Contents |
|---|---|
| `packages/provider/src/pack.ts` | router root, key, excluded ids, label maps, format overrides |
| `packages/provider/src/curated.ts` | facts for the two pinned fallback models |
| `packages/provider/src/effort.ts` | the measured effort table |
| `packages/provider/src/invariants.ts` | capability ground truth |
| `packages/provider/fixtures/` | one captured catalog (24 models) |
| `packages/provider/test/` | effort-matrix and fallback consistency |
| `extensions/pi.ts`, `plugins/opencode.ts` | one-line shims over the adapters |
| `docs/EFFORT_MATRIX.md` | how each effort mapping was observed |

Everything else is engine.

## Install

### Pi

```jsonc
// ~/.pi/agent/settings.json
{ "extensions": ["<path-to-checkout>/extensions/pi.ts"] }
```

`extensions/pi.ts` is a shim, so an existing path keeps working. It re-exports
`adapters/pi/src/index.ts`.

### OpenCode

```jsonc
// opencode.json
{ "plugins": ["file://<path-to-checkout>/plugins/opencode.ts"] }
```

Paths are placeholders on purpose: an absolute path is machine-specific. See
`docs/INSTALL.md` for both harnesses and for why a `github:` spec does not work
until the adapter is published or bundled.

Environment:

- `NINE_ROUTER_API_KEY` (default `sk_9router`)
- `NINE_ROUTER_BASE_URL` (default `http://127.0.0.1:20128`)

## Verify

```sh
task setup
task check            # typecheck, unit tests, conformance, invariants, doctor
task check:catalog    # project the captured catalog, assert the invariants
task report --write   # regenerate docs/PROVIDERS.md
task pricing          # print the T3 Code price block for this provider
```

`task check:catalog -- --live` talks to the router, so it only runs where the
router does.

## Why the effort table is measured

The router normalises effort: asking for `max` can reach the upstream as `xhigh`,
and for one route the router translates it into a Claude thinking budget. A table
copied from a vendor would therefore be wrong in a way that looks authoritative.
Every entry in `src/effort.ts` corresponds to a line in
[`docs/EFFORT_MATRIX.md`](docs/EFFORT_MATRIX.md), observed in the router's
`THINK:<level>` request log.

A model with no entry and no declaration gets no effort menu; it stays visible.
`task check:catalog` lists those, which is how the gap stays visible instead of
being filled with a guess.

## License

MIT.
