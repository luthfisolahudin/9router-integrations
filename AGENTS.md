# 9router-integrations

## What this repo is

A provider checkout for **9Router** (`http://127.0.0.1:20128/v1` by default),
shared by Pi and OpenCode. The router's own catalog is read at `/v1/models`; no
model list is maintained by hand.

The router normalises effort itself — asking for `max` can reach the upstream as
`xhigh`, and for one route it becomes a Claude thinking budget — so the effort
table is measured, never copied from a vendor.

## Read first

- `docs/DESIGN.md` — why membership, metadata and behaviour are three questions.
- `docs/STRUCTURE.md` — the package cut and the import matrix.
- `docs/SYNC.md` — how a provider repo takes template updates.
- `docs/ADDING-A-PROVIDER.md` — the long form of the `add-provider` skill.
- `docs/THINKING.md` — declared formats, measured efforts, and the evidence rule.
- `docs/EVIDENCE.md` — this repo's probe log.

## Packages and layers

Four words decide where a line of code goes:

| Word | Meaning | Package |
|---|---|---|
| facts | vendor data and measurements | `packages/provider` |
| policy | vendor-neutral rules and contracts | `packages/runtime/contract` |
| mechanics | I/O that applies policy to facts | `packages/runtime/catalog` |
| adapters | host wiring (thin) | `adapters/pi`, `adapters/opencode` |
| factories | reusable host adapters | `packages/runtime/pi`, `packages/runtime/opencode` |

Import rules, enforced by `workspace:*` deps and `task check:boundaries`:

- `packages/contract` imports nothing from this repo.
- `packages/catalog` may not import a provider.
- `packages/provider` may not import a catalog or an adapter.
- an adapter may not import another adapter.
- `packages/cli` may not import an adapter.
- `packages/conformance` may import everything, and is the only package that does.
- Import across packages by package name, never by relative path. Package names
  follow one grammar: `@luthfisolahudin/<project>-integrations-<role>`. The head
  token names the owner (`ai-integrations` upstream, `9router` here), so
  `ai-integrations-pi` is the factory and `9router-integrations-pi` is wiring.
- A package that needs the vendor imports it through `#provider`, an alias each
  consumer package maps to `src/provider.ts`, which re-exports
  `../../../provider/src/index.ts`. The alias is structural: only the packages
  allowed to see the vendor declare it.

`packages/runtime/**` and `packages/dev/**` are release-owned, copied from
`ai-integrations`. `ai-integrations.lock.json` lists each of those files with
its sha256, so editing one is a lock violation, not a quiet fork. Change them
upstream and take a new tag; see `docs/SYNC.md`.

## Commands

```sh
task check            # engine verify + typecheck + tests + boundaries + catalog + report + doctor
task check:catalog    # project the fixture/live catalog, assert invariants
task probe:effort     # measure thinking/effort for one model (needs an API key)
task probe:routes     # which wire routes the endpoint exposes
task report --write   # regenerate docs/PROVIDERS.md
task sync:upstream    # copy packages/runtime + packages/dev from a tagged release
task doctor           # symlink pair, AGENTS.md, skills, vendor shape
task pricing          # T3 Code price block: print, --check, or --write
```

## Hard invariants

1. **Never invent a capability.** Unknown stays unknown; a guessed `vision` or
   `contextWindow` shows up as `default` provenance and is reviewed in a diff.
2. **Never invent an effort.** A model gets an effort menu only when
   `packages/provider/src/effort.ts` has a measured entry backed by
   `docs/EVIDENCE.md`. Unmeasured means no menu, not a plausible default.
3. **Never derive reasoning or vision from a regex on the model id.**
4. **Membership is discovered.** A pack may pin a small fallback so a provider is
   never registered empty, and nothing else.
5. **`packages/provider` is the only vendor surface.** No vendor URL, header, or
   model id belongs anywhere else.
6. **Generated files are not edited.** `docs/PROVIDERS.md` is output.
7. **No credentials in the repo.** Keys come from the environment named in the
   pack; fixtures are sanitised payloads.
8. **`packages/contract`'s public surface changes only with a
   `PACK_SCHEMA_VERSION` bump**, plus a migration note in `docs/SYNC.md`.

## Change protocol

Fixture first, then invariants, then the projection test, then the code:

1. capture a real payload into `packages/provider/fixtures/`;
2. declare where the facts live in `packages/provider/src/pack.ts`;
3. write the invariant from the vendor's docs, not from the catalog;
4. run `task check:catalog`, then `task probe:effort` if the model reasons;
5. append an evidence line with the date, the command, and the observed signal;
6. run `task check` before claiming the change is done.

## Human decisions

Ask before: bumping `PACK_SCHEMA_VERSION`, deleting a
fallback id, choosing an effort mapping when the probe is inconclusive, or
turning a `default` provenance into a `curated` one.

## Vendor notes

`docs/EFFORT_MATRIX.md` records how each effort mapping was observed; `docs/REPO.md` holds the rest.
