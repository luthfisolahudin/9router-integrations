> Implementation note: the shipped engine splits this design into `packages/contract` (policy) and `packages/catalog` (mechanics), and the host adapters live in `adapters/`. Where this document says `src/core`, `hosts/`, or `packages/pi`, read the current layout in `README.md` and `docs/STRUCTURE.md` §7.

# Design: `openai-compatible-integrations`

Generic OpenAI Chat Completions provider integrations for OpenCode and Pi, with
live model discovery and no hand-maintained model lists.

Status: proposal. Written after auditing the live setup on this Windows machine
and on `thunk`, probing all three provider catalogs, and reading
`9router-integrations` and `commandcode-integrations`.

---

## 1. Goal

One repository that owns the integration for *generic* OpenAI-compatible
aggregators — currently CosmosHub, GutsAI, InferX — the same way

- `9router-integrations` owns 9Router (one router, one repo), and
- `commandcode-integrations` owns CommandCode (one vendor, one repo).

The defining property: **membership is discovered, never typed.** `GET /models`
is the only source of model IDs; everything else (limits, modalities, reasoning,
effort, price) is resolved through an explicit, auditable ladder instead of being
copied by hand into `models.json` / `opencode.json`.

Success criteria:

1. Adding a model to a provider makes it appear in OpenCode and Pi on both
   machines with no config edit.
2. Removing a model removes it everywhere, with no stale entries.
3. A capability that is not verifiable is never invented. Unknown stays unknown,
   visibly.
4. `windows` and `thunk` run the same code and the same data. No 244-vs-253-line
   drift between two copies of a plugin.
5. Adding a fourth aggregator is a data change (one pack), not a code change.

## 2. Non-goals

- No emulation of a vendor CLI or a non-OpenAI protocol unless a pack asks for it.
- No hosted proxy, no local gateway process. Direct `baseUrl` only.
- No absorbing 9Router or CommandCode. They have bespoke behavior (router effort
  evidence, endpoint routing) and stay separate repos. See §15 for the small
  amount of shared code that may later be extracted.
- No published npm package, no install step. Entrypoints are loaded from the
  checkout, as `9router-integrations` already does.

## 3. What runs today (audit)

### Windows

| Harness | State |
|---|---|
| Pi 1.5.0 | `models.json` registers `cosmoshub`, `gutsai`, `inferx` with **`models: []`** — three dead providers. Only `commandcode` works, via `extensions/commandcode-dynamic.ts`. |
| OpenCode 2.2.6 | `plugins/provider-models` (generic, cache-backed, 10 min refresh) fills `cosmoshub` (36), `gutsai` (42), `commandcode-anthropic` (12). Hand-written `providers.inferx` (15 models) and a dead v1-style `provider.commandcode` block. `@ex-machina/opencode-anthropic-auth@1.8.0` fails to load (v1 plugin format). |
| T3 Code | `providerInstances.pi` enabled, injects `COSMOSHUB_API_KEY`, `GUTSAI_API_KEY`, `COMMANDCODE_API_KEY`, `INFERX_API_KEY`, `PI_CODING_AGENT_DIR`. Default model `commandcode/deepseek/deepseek-v4.1-flash`. Pricing handled by `usagePriceOverrides`, renames by `usageModelAliases`. |

### thunk

| Harness | State |
|---|---|
| Pi 1.5.0 | `extensions: ["~/code/9router-integrations/extensions/pi.ts", sesh]`, default `9router/cbcn/kimi-k3`. `models.json` has **one** provider: `cosmoshub` with **47 hand-written models**. No GutsAI, no InferX, no CommandCode. |
| OpenCode 2.2.6 | `plugins/provider-models` **244 lines**, with `mode: add\|merge` and `defaultMaxOutput` — a *newer* variant than the 253-line Windows copy. Also `plugins/9router-models`. `providers.inferx` 15 models, `providers.commandcode` manual block. |
| 9Router | Local service on `127.0.0.1:20128`, 23 models, works with the default `sk_9router` key. |

### Findings that drive this design

1. **The two Windows/thunk plugin copies have already diverged.** One speaks
   `mode`/`defaultMaxOutput`, the other does not. Both are unversioned
   `~/.config` files. This is the strongest argument for a repo.
2. **Pi is the weak side.** Windows Pi shows *zero* models for all three
   providers, and `pi --list-models` on thunk shows only the two pinned 9Router
   fallback models because the factory does not preload a catalog. Pi is also
   the harness T3 Code actually drives on Windows, so this is the highest-impact
   gap.
3. **Capabilities are currently guessed by regex.** The Windows plugin does
   `supportsReasoning = /deepseek|gpt|glm|kimi|qwen|.../i.test(id)`. It marks a
   model as reasoning-capable because of its *name*, even when the provider says
   otherwise, which is exactly the class of silent degradation
   `9router-integrations/src/invariants.ts` exists to prevent.
4. **Effort is currently invented.** The plugin advertises
   `low|medium|high|xhigh|max` for every reasoning model and passes the value
   through unmodified. Probes below show that is wrong in both directions.

## 4. Empirical survey of the three providers

| | CosmosHub | GutsAI | InferX |
|---|---|---|---|
| base | `https://api.cosmoshub.tech/v1` | `https://api.gutsai.id/v1` | `https://model.inferx.net/endpoints/v1` |
| live models | 36 | 42 (33 `ok`, 9 `offline`) | 14 |
| `/models` envelope | `{object, data[]}` | `{object, data[]}` | `{object, data[]}` |
| limits | `capabilities.{contextWindow,maxOutput}` + `context_length`/`max_completion_tokens` | **none** | **none** |
| modalities | `capabilities.{vision,pdf,audioInput,videoInput,imageOutput,audioOutput}` | `supports_vision`, `input_modalities[]` | **none** |
| tools / reasoning | `capabilities.{tools,reasoning}` | `supports_reasoning` | **none** |
| thinking hint | `capabilities.{thinkingFormat,thinkingCanDisable,thinkingRange}` | none | none |
| availability | none | `status: ok\|offline`, `uptime_pct`, `last_check` | none |
| pricing | none | `price_per_1m` (**IDR**, blended), `price_per_image` | none |
| display name | none (`owned_by` is unreliable: `kimi-k2.7-code` is labelled `Alibaba`) | `provider` (reliable) | none |
| other routes | `/messages`, `/responses` | `/messages`, `/responses` | unknown |

Catalog quality tiers:

- **Tier A — self-describing.** CosmosHub. Membership, limits, modalities and a
  per-model `thinkingFormat` all come from the catalog. `thinkingRange` is
  `null` for every model, so the *effort levels* are still undeclared.
- **Tier B — partially describing.** GutsAI. Modalities, reasoning, price and
  availability are declared; **no limits at all**. Its own marketing site
  (`gutsai.id/models`) does publish `1M in / 128K out` per model, so limits are
  curatable from a vendor-owned source rather than guessed.
- **Tier C — bare.** InferX. `/models` returns `{id, object, created, owned_by}`
  and nothing else, and `/models/{id}` 404s. `models.dev` knows **12** ids, of
  which only **5** are in today's live 14 — so models.dev is a partial hint, not
  a catalog.

That spread is the whole design problem: one engine, three data qualities.

### Probe results that kill "assume the wire accepts what we send"

- CosmosHub `/chat/completions` rejects `reasoning_effort: "bogus"` with a
  generic HTTP 400 `invalid_parameter` — no enum echoed, so support must be
  derived per level by probing, not read from an error.
- CosmosHub `deepseek-v4.1-flash`: `max` → 11 reasoning tokens, `low` → 10,
  `minimal` → 11. **No observable difference.** Claiming an effort mapping here
  would be fiction.
- GutsAI `deepseek-v4.1-flash`: `reasoning_effort: "minimal"` produced thinking
  tokens (7) while `"max"` produced none. The parameter is accepted but not
  honored in the direction the name implies.
- GutsAI `minimal` request also shows the parameter reaches a different upstream
  than the plain request — combined with `failover under 1s`, the same model ID
  can be served by different backends per request. Effort probing on GutsAI is
  therefore *sampling*, and needs repeats.
- InferX currently answers every request with
  `429 service failure: tenant ... quota exceeded`. Catalog discovery and chat
  are independent failure domains and must be treated as such.
- GutsAI sits behind Cloudflare with a cross-signed chain Node rejects but curl
  accepts: `SELF_SIGNED_CERT_IN_CHAIN` unless Node runs with `--use-system-ca`.
  A repo that only talks to it via `fetch` on Node will fail on this machine.

## 5. The three questions, separated

The current plugin answers all three with one guess. The design answers them
independently, each with its own ladder and its own failure mode.

### 5.1 Membership — "which models exist?"

1. Live `GET /models` (cache-first, background refresh).
2. Last-known-good snapshot on disk.
3. Repo-pinned fallback membership (`STARTUP_FALLBACK`, as 9router already has).
4. Never: an empty provider. An empty provider is a bug, not a state.

Filters belong here and are pack data: include/exclude patterns, drop
`status: offline` (GutsAI), drop obviously non-chat ids (embeddings), and
`requireEndpoints` style gates if a model must expose `/chat/completions`.

### 5.2 Metadata — "how big is it, what can it take?"

Resolution ladder, first hit wins, **provenance recorded per group**:

| # | Source | Example |
|---|---|---|
| 1 | live catalog, pack-declared field aliases | CosmosHub `capabilities.contextWindow`; GutsAI `input_modalities` |
| 2 | disk snapshot | offline start |
| 3 | pack curated table (vendor-documented) | GutsAI limits from `gutsai.id/models`; InferX limits for the ids you actually use |
| 4 | `models.dev` by provider id, then by normalized model slug | InferX (5/14 hits), CommandCode (72) |
| 5 | pack default + explicit "unknown" mark | `contextWindow: 128000, provenance: "default"` |

`models.dev` resolution needs the two tricks `pi-bifrost-provider` already
worked out: normalize keys by last path segment / strip `-YYYYMMDD`, and take
the **majority** value per id with ties to the larger number (gateways clip
windows more often than they inflate them).

Never derive `reasoning` or `vision` from an id regex when the provider has an
opinion. Heuristics are only allowed at level 5, must be flagged, and must be
overridable by a pack invariant.

### 5.3 Behavior — "what do we send for thinking, and how do we know?"

This is where guessing hurts most, and where the existing repos already have the
right answer: **measured, documented, and checked at CI time.**

- `thinkingFormat` pass-through where the host supports the value.
  CosmosHub declares `openai|deepseek|qwen|zai|kimi|gemini-level|minimax|step`;
  Pi supports `openai|deepseek|qwen|zai|...` but **not** `kimi`, `gemini-level`,
  `minimax`, `step`. Those four need either a measured mapping to a supported
  format or an explicit "no effort menu" outcome.
- `thinkingCanDisable: false` (11 CosmosHub models) → hide `off` from
  `/thinking` (`thinkingLevelMap: { off: null, ... }`), as 9router does.
- Effort values are never asserted from the provider name. A model gets an
  explicit effort only after a probe records evidence, exactly like
  `docs/EFFORT_MATRIX.md`. Unmeasured → the model stays visible with no effort
  menu, and `check:catalog` fails.

## 6. Prior art, and what to take from each

| Source | Take | Skip |
|---|---|---|
| `9router-integrations` | repo shape (entrypoints loaded from checkout), `capabilities` view, `displayName()`, `STARTUP_FALLBACK`, invariants, `check:catalog`, effort matrix + evidence doc, stubbed-fetch tests | its single-router assumption and `cbcn/`-prefixed ids |
| `commandcode-integrations` | `core` + per-host adapters, normalized record, protocol routing by declared capability, cache with `catalogVersion`/`refreshAfterSeconds`, `docs/design.md` as a contract | monorepo publish flow (not needed), `/alpha/generate` legacy |
| `pi-bifrost-provider` | native `createProvider` + `refreshModels(context)` + `context.publish({persist, update})`, in-place catalog mutation, models.dev majority-vote index, cache TTL, non-TTY notice discipline | per-token price heuristic (`<= 0.01` × 1e6) — ambiguous by construction |
| `yuhp/opencode-models-discovery` | v2 config shape (`plugins` + `providers`), enrichment via models.dev, provider filters/timeouts | its own config surface; we want packs in-repo |
| `rmk40/opencode-model-scout`, `Maheidem/model-discovery` | endpoint-specific enrichment (llama.cpp `/props`, Ollama `/api/tags`) as a pattern for "ask the vendor's real metadata endpoint" | local-server focus |
| `models.dev/api.json` | a free, no-key, 235-provider metadata source, usable as ladder level 4 | treating it as truth for aggregators (it lags: CosmosHub and GutsAI absent, InferX stale — 5 of 14 live ids) |

## 7. Repository shape

> Superseded in part by `TEMPLATE.md`: the engine described here ships as a
> public template repo, and each provider (CosmosHub, GutsAI, InferX) gets its
> own private repo holding exactly one pack. The engine keeps multi-pack
> support; the deployment is one pack per repo.

Name: **`openai-compatible-integrations`** (the boundary is the protocol +
discovery contract, not the vendor). Alternative: `ai-aggregator-integrations`.

```
openai-compatible-integrations/
  README.md                  # contract + install (loaded from checkout)
  docs/
    DESIGN.md                # this document, kept current
    THINKING.md              # measured format/effort evidence per provider+model
    PROVIDERS.md             # generated: live inventory, provenance, gaps
  src/
    record.ts                # NormalizedModel + Provenance types
    parse.ts                 # envelope shapes, id validation, dedupe
    capabilities.ts          # capability view (strict === true), two input shapes
    limits.ts                # ladder + models.dev index + majority vote
    naming.ts                # brand/owner/slug -> display name (curated)
    effort.ts                # measured wire effort per "provider/model"
    thinking.ts              # thinkingFormat -> host compat mapping
    invariants.ts            # curated ground truth per "provider/model"
    packs/                   # the only files you touch to add a provider
      cosmoshub.ts
      gutsai.ts
      inferx.ts
      index.ts
    cache.ts                 # per-provider snapshot, ETag, TTL, atomic write
    discover.ts              # fetch + parse + filter + resolve, returns records
    report.ts                # pure analysis behind check:*/probe:*
  hosts/
    pi.ts                    # one extension registering N native providers
    opencode.ts              # one plugin transforming N providers
  scripts/
    check-catalog.ts         # projections, invariants, staleness, unmeasured
    probe-effort.ts          # measured effort probe, appends evidence
    probe-routes.ts          # chat/messages/responses availability
    sync-models-dev.ts       # refresh the metadata hint snapshot
  test/
    fixtures/<provider>.json # sanitized live payloads
    *.test.ts
```

Why a flat `src/` + `hosts/` instead of `packages/*`: nothing is published, both
hosts import the same TypeScript files, and 9router already proved a checkout
path works on both platforms. A pnpm workspace here would add ceremony without
buying anything. Revisit only if this repo starts feeding a third host.

### The pack (data, not code)

One file per provider, typed, with no host imports:

```ts
export const cosmoshub: Pack = {
  id: "cosmoshub",
  name: "CosmoHub",
  baseUrl: "https://api.cosmoshub.tech/v1",
  api: "openai-completions",
  auth: { kind: "bearer", apiKeyEnv: "COSMOSHUB_API_KEY" },
  discovery: {
    path: "/models",
    timeoutMs: 5_000,
    parser: "openai-data",          // named parser, still validated strictly
    userAgent: "openai-compatible-integrations/1",
  },
  fields: {
    // where this provider puts each fact, most-specific first
    contextWindow: ["capabilities.contextWindow", "context_length"],
    maxOutput: ["capabilities.maxOutput", "max_completion_tokens"],
    vision: ["capabilities.vision"],
    tools: ["capabilities.tools"],
    reasoning: ["capabilities.reasoning"],
    thinkingFormat: ["capabilities.thinkingFormat"],
    thinkingCanDisable: ["capabilities.thinkingCanDisable"],
  },
  filter: { dedupeBy: "id" },
  fallback: [{ id: "deepseek-v4.1-flash" }],   // pinned, minimal, offline-usable
  curated: {
    // ids whose display name or limits the catalog cannot express
    "gpt-6.1-terra": { name: "GPT 6.1 Terra" },
  },
};
```

GutsAI's pack additionally declares `pricing: { field: "price_per_1m", currency:
"IDR", per: 1_000_000, blended: true }` and `filter.dropWhen: "status !== 'ok'"`
(behind a config switch so an offline model can still be inspected).
InferX's pack declares `fields: {}` and leans on `curated` + `models.dev`.

Adding a provider must not require touching `hosts/`, `src/record.ts`, or tests.

## 8. Normalized record and provenance

```ts
type Source = "catalog" | "cache" | "curated" | "models.dev" | "default" | "measured";

interface NormalizedModel {
  providerId: string;             // "cosmoshub"
  id: string;                     // exact upstream id
  name: string;                   // display name
  contextWindow: number;
  maxOutput: number;
  input: ("text" | "image" | "pdf" | "audio" | "video")[];
  output: ("text" | "image" | "audio")[];
  tools: boolean | undefined;
  reasoning: boolean;
  thinking: {
    format?: ThinkingFormat;      // as declared, not yet host-mapped
    canDisable?: boolean;
    wireEffort?: string;          // only when measured
  };
  pricing?: { input?: number; output?: number; source: "catalog" | "curated" };
  availability: "ok" | "degraded" | "offline" | "unknown";
  provenance: Record<"limits" | "modalities" | "reasoning" | "pricing" | "effort", Source>;
  excluded?: { reason: string };  // recorded, not silently dropped
}
```

`provenance` is not decoration. It is what lets `check:catalog` fail on
`effort: "default"` for a reasoning model, and what lets the README tell you
which numbers are guesses. It also makes the "unknown vs wrong" tradeoff
reviewable in a diff.

## 9. Host adapters

### 9.1 Pi (`hosts/pi.ts`)

Two options on the table; recommend **native provider**, with one caveat.

| | Native `createProvider` (commandcode + bifrost) | Legacy `registerProvider(id, ProviderConfig)` (9router) |
|---|---|---|
| persistence | Pi-owned via `context.publish({ persist })`, restores offline | `refreshModels` return + optional publish |
| `/login` flow | yes | no |
| `refreshModels` timing | explicit `RefreshModelsContext` (`stored`, `allowNetwork`, `signal`) | called on catalog refresh |
| complexity | higher; must mutate the catalog array in place (bifrost documents this trap) | lower |

Use native, because it is the only form that gives a correct offline restore plus
`/login`, and because `commandcode-integrations/packages/pi` already establishes
the pattern. Requirements the adapter must meet:

1. **Preload before registration.** Read the snapshot, build models, register,
   *then* refresh. This directly fixes the observed `pi --list-models` showing
   only fallback models.
2. **Never register an empty catalog.** Fallback membership is mandatory.
3. **Do not block startup on the network longer than ~2.5 s**; T3 Code gives
   model discovery roughly five seconds (the thunk plugin comments this).
4. `compat` per model, not per provider: `supportsReasoningEffort` only when an
   effort was measured, `thinkingFormat` from §10, `maxTokensField` and
   `requiresReasoningContentOnAssistantMessages` per provider evidence.
5. `thinkingLevelMap` must null out unsupported levels, including `off` when
   `thinkingCanDisable === false`.
6. Leave `models.json` as the escape hatch for per-model pins
   (`modelOverrides`), not as the inventory.

### 9.2 OpenCode (`hosts/opencode.ts`)

Keep `Plugin.define` + `ctx.provider.transform` + `editor.add` (proven on 2.2.6),
but:

1. Cached inventory is registered **before** any network work (the 5 s budget).
2. `mode: "merge"` only for providers that already exist from `models.dev`;
   default `add`. Merge must be by model id with discovered entries winning, and
   the merged provider must keep its declared `package` (a manual config block
   and a plugin addition must never both own one provider).
3. Reasoning exposure: prefer declared `capabilities.reasoning.effort` when the
   pack has it; otherwise `variants` from measured effort only.
4. `ctx.provider.reload()` after refresh; unref the timer.
5. Delete the `providers.<id>` and `provider.<id>` config blocks once the plugin
   owns the provider — that duplication is exactly how `inferx` ended up with two
   inventories.
6. Pin `small_model` per machine to a measured, cheap model (9router already
   learned that title turns bypass request hooks).

## 10. Thinking and effort policy

### Format mapping (declared → wire)

| Declared `thinkingFormat` | Pi `compat.thinkingFormat` | OpenCode |
|---|---|---|
| `openai` | `openai` (`reasoning_effort`) | `variants[].settings.reasoningEffort` |
| `deepseek` | `deepseek` (`thinking.type` + effort) | same, plus interleaved `reasoning_content` |
| `qwen` | `qwen` (`enable_thinking`) | same |
| `zai` | `zai` (`thinking.type`) | same |
| `kimi`, `gemini-level`, `minimax`, `step` | **unmapped** | **unmapped** |

The unmapped four are the honest part of the design. Each one needs an entry in
`docs/THINKING.md` that says either "measured: behaves as `openai` at effort X"
or "probe inconclusive; register without an effort menu". CosmosHub's own
`gemini-level` label suggests a non-effort mechanism (level, not tokens), and
Pi has no `gemini-level` thinking format, so silence plus visible visibility is
better than a wrong mapping.

### Probe protocol (replaces assumption)

For each `(provider, model)`:

1. **Accept matrix.** One 32-token request per level
   (`minimal|low|medium|high|xhigh|max`, plus `off`/absent). Record status,
   `finish_reason`, usage `reasoning_tokens`, `reasoning_content` length, latency.
   400 → unsupported. 200 → accepted.
2. **Differentiation.** If every supported level produces the same reasoning
   signature (like CosmosHub `deepseek-v4.1-flash`: 11/10/11), record
   `wireEffort: "none-observed"` and ship **no** effort menu. Do not pick a
   winner from noise.
3. **Repetition.** Aggregators fail over between backends (GutsAI: <1 s failover)
   and temperature is 0 by default, so **3 samples per level, 1 model at a time**;
   require a consistent ordering before writing a mapping.
4. **Direction check.** If a higher level produces *less* thinking (GutsAI
   `minimal` > `max`), record the inversion in `THINKING.md` and ship the level
   that actually buys depth.
5. **Write evidence, not conclusions.** Every entry in `src/effort.ts` carries a
   date, a probe command, and the observed signature, exactly like
   `docs/EFFORT_MATRIX.md`.

`check:catalog` fails when a reasoning model has no entry; `--allow-unmeasured`
exists for pruning days. That is the 9router contract, reused verbatim.

## 11. Correctness machinery

- **Strict parse.** Malformed envelope, missing id, duplicate id → throw. Never
  "best effort" a catalog into existence.
- **Projection tests.** Every fixture must project through *both* host mappers
  without throwing; snapshot the result. A new catalog field cannot silently
  break one host.
- **Invariants.** Curated, vendor-documented facts (`vision`, `reasoning`,
  `tools`, minimum `contextWindow`) asserted with strict equality against the
  live catalog. This is how a provider regression becomes a CI failure instead
  of a silently degraded picker.
- **Staleness.** Effort entries, invariants, curated names and curated limits
  that reference ids absent from the live catalog are reported; hard-fail for
  effort, warn for names.
- **Coverage.** Live ids with no curated limit and no `models.dev` hit are
  reported as "defaulted" so the guess is visible.
- **Availability.** `status: offline` models are excluded from pickers by
  default but listed in `PROVIDERS.md`; when a model flips offline the check
  reports it rather than letting the picker advertise a dead model (GutsAI's
  `/v1/messages` really does return `model_offline` for the 9 offline ids).

## 12. Cache, refresh, offline

- Per-provider snapshot at
  `$XDG_CACHE_HOME/openai-compatible-integrations/<provider>.json` (honouring
  `LOCALAPPDATA` on Windows via `os`-level path resolution), atomic write,
  `{ checkedAt, etag?, catalogVersion?, records }`.
- Startup: snapshot → register → background fetch. Never the reverse.
- Refresh: 10 min timer + refresh on `/reload`; honour `If-None-Match` when a
  provider gives an ETag; accept `refreshAfterSeconds` if one ever appears.
  Rate-limit yourself: GutsAI documents 50 req/min per key, and catalog fetches
  must not eat the budget.
- Failure: keep last-known-good; surface one line per provider per process (UI
  notice in Pi, `console.error` in OpenCode). Never spam a TUI.
- Offline first run: pinned fallback membership, so both harnesses are usable
  before the network exists.

## 13. Pricing policy

- CosmosHub, InferX: no price in the catalog → emit zero cost, mark
  `pricing.source: "none"`. T3 Code's `usagePriceOverrides` is the right place
  for real numbers.
- GutsAI: `price_per_1m` is **IDR per 1M tokens, blended in/out** (verified:
  `gpt-5.6-luna` = `500` ↔ "Rp 500 per 1M"; claude models = 3000/1400/1800 ↔
  Rp 3.000/1.400/1.800). Two problems: it is not USD, and Pi/OpenCode want
  separate input/output USD per 1M. Options, in order of preference:
  1. zero cost + T3 overrides (default),
  2. opt-in conversion with a **pinned, dated** IDR→USD rate and the blended
     price applied to both fields, clearly labelled approximate,
  3. curate the vendor's official in/out prices from `gutsai.id/models` (drifts
     with upstream pricing changes; needs a check).
- Never invent a cache-read/write price. Zero plus a note beats a plausible
  fiction in a usage report.
- Emit `usage-model-aliases`-friendly ids unchanged; do not normalize model ids
  (`deepseek-v4.1-flash` ≠ `deepseek-v4.1-flash-1017`).

## 14. Deployment across two machines

- **Install surface**: `settings.json.extensions` (Pi) and `opencode.json.plugins`
  (OpenCode) point at the checkout, mirroring how 9router is wired on thunk:
  `"/home/luthfi/code/openai-compatible-integrations/hosts/pi.ts"` and
  `"file:///home/luthfi/code/openai-compatible-integrations/hosts/opencode.ts"`.
  Windows uses the `C:/Users/user/code/...` path. No symlinks needed; the
  dotfiles repo keeps the two config files, the integration repo keeps the code.
- **Keys**: from the environment only. On Windows T3 Code injects them via
  `providerInstances.pi.environment`; on thunk they come from the shell env
  (`~/.config/shell/private.local.sh`). Packs declare `apiKeyEnv`; nothing else
  stores a key. OpenCode's own `auth.json` path is used only if a pack asks for
  the native auth flow.
- **TLS**: document the Node CA issue (`NODE_OPTIONS=--use-system-ca` or
  `NODE_EXTRA_CA_CERTS`) for GutsAI; do not disable verification in code.
- **Cleanup that the migration must include**:
  - Windows `models.json`: drop the three empty provider blocks.
  - thunk `models.json`: drop the 47-model `cosmoshub` block.
  - Windows `opencode.json`: drop `@ex-machina/opencode-anthropic-auth@1.8.0`
    (fails to load), `providers.inferx`, and the v1 `provider.commandcode` block.
  - thunk `opencode.json`: drop `./plugins/provider-models` (superseded),
    `providers.inferx`, keep `./plugins/9router-models` or replace it with the
    9router repo's `plugins/opencode.ts`.
  - Two divergent `provider-models` copies under `~/.config/opencode/plugins/`.

## 15. Migration plan

| Phase | Work | Exit test |
|---|---|---|
| 0 | Scaffold repo, move shared helpers out of the Windows plugin, add fixtures from today's three payloads | `pnpm check` green; fixtures parse |
| 1 | Engine + packs for cosmoshub (Tier A), gutsai (Tier B), inferx (Tier C); `check:catalog` + `PROVIDERS.md` | every live id resolves; gaps listed with provenance |
| 2 | Pi host; verify on Windows with T3 Code and on thunk | `pi --list-models` shows live membership on both machines; no empty provider |
| 3 | OpenCode host; replace `provider-models`, delete manual blocks | `opencode models` shows the same ids as `pi --list-models` |
| 4 | Effort/thinking probes for the models actually used; fill `THINKING.md` and `src/effort.ts` | `check:catalog` passes without `--allow-unmeasured` |
| 5 | Cross-machine install in dotfiles; delete dead config from §14 | both machines from one checkout, no `~/.config` copies |
| 6 | Optional: `models.dev` snapshot refresh job, `PROVIDERS.md` regeneration | weekly diff review |

Phase ordering matters: hosts before probes, because a wrong effort menu is
worse than no menu, and membership before metadata, because limits without
membership help nobody.

## 16. Risks and open decisions

Risks:

- **Aggregator catalog churn.** These are resale gateways; ids appear and vanish
  weekly (`cosmoshub` today has no `glm-5.3-flash`-style aliases, GutsAI has 9
  offline). Mitigation: snapshot + fallback + `check:catalog` in CI on a schedule.
- **Silent provider-side capability lies.** GutsAI's `price_per_1m` is
  plausible-looking and in the wrong currency; CosmosHub's `owned_by` mislabels
  Kimi. Mitigation: invariants assert only vendor-documented facts, never the
  catalog's own claims.
- **Effort measurement cost.** Probes cost real tokens and wall time on gateways
  with failover. Mitigation: probe only models in `enabledModels`/recently used,
  keep samples small, cache evidence with dates.
- **Tier C providers stay mostly defaulted.** InferX will show 128 K/16 K guesses
  for 9 of 14 models unless curated. That is acceptable only if the picker or
  `PROVIDERS.md` says so.

Decisions I need from you:

1. **Offline models**: hide by default (recommended) or show with a warning?
2. **Pricing**: zero + T3 overrides (recommended), or convert IDR with a pinned
   rate, or curate official USD in/out from the vendor page?
3. **Non-chat models**: exclude embeddings/image models from the picker (InferX
   has `Qwen3-Embedding-8B`, GutsAI has `gpt-image-2.5` and
   `gemini-3.1-flash-image`)?
4. **Curated limits for Tier B/C**: are you willing to maintain a small
   `curated` table per pack (with vendor URLs as evidence), or should the design
   accept `models.dev` + defaults only?
5. **Repo name**: `openai-compatible-integrations` vs
   `chat-completions-integrations` vs `ai-aggregator-integrations`?
6. **Where the repo lives** on each machine, and whether it goes into dotfiles as
   a submodule or stays an independent clone referenced by both config files.
7. **Effort scope**: probe every reasoning model (expensive, complete) or only
   the models you actually select (cheap, partial, `--allow-unmeasured` in CI)?
8. **9Router on Windows**: is the local router supposed to run here too? Today it
   only runs on thunk, so Windows Pi/OpenCode have no 9Router at all, which is a
   separate gap from this repo's scope.
