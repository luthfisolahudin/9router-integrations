# ai-provider-integrations-template

Live model discovery for any OpenAI Chat Completions endpoint, shared by **Pi**
and **OpenCode**. Membership comes from the provider's `/models`; nothing is
listed by hand.

```text
provider /models ──▶ catalog (parse, cache, provenance) ──▶ adapters ──▶ Pi
                                                          └────────────▶ OpenCode
```

## Why this exists

Most provider integrations ask you to paste a model list and then drift.
This one discovers the list, and is explicit about the two things a catalog
usually gets wrong:

- **limits and modalities** that the provider does not send → resolved through a
  documented ladder (catalog → curated → models.dev → default) with provenance
  recorded per limit, so a guess is never displayed as a fact;
- **thinking/effort** that the provider does not declare → measured with a probe,
  and left out entirely when the probe shows no observable difference.

## Use it

```sh
task setup
task check          # typecheck + 100 unit tests + import boundaries + doctor
task check:catalog  # project the fixture, assert curated invariants
```

Install (one entry per harness, path to your own checkout):

```jsonc
// Pi settings.json
{ "extensions": ["<path-to-checkout>/adapters/pi/src/index.ts"] }

// OpenCode opencode.json
{ "plugins": ["file://<path-to-checkout>/adapters/opencode/src/index.ts"] }
```

Paths are intentionally shown as placeholders: an absolute path is
machine-specific. See `docs/INSTALL.md` for both harnesses, and for why a
`github:` spec does not work yet.

## Make it yours

```sh
task init -- --id acme --name "Acme AI" --base-url https://api.acme.test/v1 --api-key-env ACME_API_KEY
```

That renders the README, seeds a pack, deletes the three-tier corpus, and writes
the template lock. Then follow `docs/ADDING-A-PROVIDER.md`.

## Layout

| Path | Contents |
|---|---|
| `packages/contract` | policy: pack contract, capabilities, naming, thinking, limits, effort, probe decisions |
| `packages/catalog` | mechanics: envelope parsing, discovery, cache, provenance, availability |
| `packages/provider` | **your vendor**: pack, curated facts, invariants, measurements, fallback, fixtures |
| `adapters/pi` | Pi entrypoint (`createProvider` + `refreshModels`) |
| `adapters/opencode` | OpenCode entrypoint (`Plugin.define` + `provider.transform`) |
| `packages/cli` | `check`, `probe`, `report`, `doctor`, `init`, `sync` |
| `packages/conformance` | projections, invariants, secrets, skills, AGENTS checks |
| `examples/` | Tier A/B/C catalogs used as a conformance corpus |

Workspace packages are named `<scope>/<repo>-<suffix>`; `task init` rewrites that prefix for your repo. See `TEMPLATE.md`.

The import matrix (enforced, not documented-only) lives in `docs/STRUCTURE.md`.
Agent instructions live in `AGENTS.md` (`CLAUDE.md` is a symlink to it), and the
three skills live in `.agents/skills/`.

## Design

- `docs/DESIGN.md` — three questions: membership, metadata, behaviour.
- `docs/STRUCTURE.md` — the package cut, the import matrix, the alternatives.
- `docs/THINKING.md` — format mapping, measured effort, the evidence rule.
- `docs/SYNC.md` — how a downstream repo takes template updates as a merge.

MIT.
