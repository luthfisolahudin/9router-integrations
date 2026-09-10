# 9Router effort matrix

Measured on 2026-09-06 and 2026-09-10 through local 9Router. The current
`/v1/models` response contains seventeen active reasoning models; the effort
entries below cover those models.

- `cbcn/minimax-m3`: client `max` -> wire `xhigh`
- `cbcn/glm-5.3`: client `max` -> wire `max`
- `cbcn/glm-5.3-flash`: client `max` -> wire `max`
- `cbcn/kimi-k3-1`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-pro`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-flash`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4.1-flash`: client `max` -> wire `xhigh`
- `cbcn/kimi-k3`: client `max` -> wire `max`
- `cx/gpt-6-astra`: client `max` -> wire `max`
- `cx/gpt-5.6-sol`: client `max` -> wire `max`
- `cx/gpt-5.6-terra`: client `max` -> wire `max`
- `cx/gpt-5.6-luna`: client `max` -> wire `max`
- `cx/gpt-5.5`: client `max` -> wire `xhigh`
- `ag/gemini-3.8-flash-high`: client `max` -> wire `max`
- `ag/claude-sonnet-4-6`: client `max` -> wire `max`
- `ag/claude-opus-4-6-thinking`: client `max` -> wire `max`
- `ag/gpt-oss-120b-medium`: client `max` -> wire `xhigh`

Models with the `ag` owner prefix are labeled as Antigravity in client model
pickers. Models with `cbcn` are labeled as CodeBuddy CN, and `cx` as OpenAI
Codex.

This is a compatibility-route matrix, not a claim about native provider
capability. OpenCode, standalone Pi, and tt Pi use 9Router's OpenAI Chat
Completions route at `<router-root>/v1`. 9Router console request logs print
`THINK:<level>` for each routed request, providing safe observable evidence of
the effective effort actually transmitted upstream.

Pi uses its `openai-completions` adapter with OpenAI `reasoning_effort` and
replays reasoning through `reasoning_content`.

For `cbcn/glm-5.3`, `cbcn/glm-5.3-flash`, and `cbcn/kimi-k3`, explicit
`reasoning_effort=max` requests completed with HTTP 200, `finish_reason=stop`,
and router logs reported `THINK:max`. While older router revisions normalized
Kimi K3 to `xhigh`, the updated router transmits literal `max`.

For `cbcn/minimax-m3`, `cbcn/kimi-k3-1`, `cbcn/deepseek-v4-pro`,
`cbcn/deepseek-v4-flash`, and `cbcn/deepseek-v4.1-flash`, an explicit
`reasoning_effort=max` request completed with HTTP 200 but safe router metadata
reported `THINK:xhigh`, proving that `max` was normalized. Matching explicit
`xhigh` requests completed with `finish_reason=stop` and router metadata
reported `THINK:xhigh`.

For `cx/gpt-5.6-terra` and `cx/gpt-5.6-luna`, explicit `reasoning_effort=max`
requests completed with HTTP 200, `finish_reason=stop`, and router logs
reported `THINK:max`.

For `cx/gpt-5.5`, explicit `reasoning_effort=max` completed with HTTP 200 and
`finish_reason=stop`, but router logs reported `THINK:xhigh`, proving
normalization. Matching explicit `xhigh` requests completed with HTTP 200 and
`THINK:xhigh`.

For `cx/gpt-6-astra` and `cx/gpt-5.6-sol`, the router accepted
`reasoning_effort=max` and reported `THINK:max`. Upstream Codex returns HTTP 400
for ChatGPT-authenticated accounts regardless of requested effort, but the
router shows no normalization, so highest-first keeps literal `max`.

For `ag/gemini-3.8-flash-high`, explicit `reasoning_effort=max` requests
completed with HTTP 200, and the router translated it to Gemini's highest tier
`THINK:high`. Literal wire `max` is preserved.

For `ag/claude-sonnet-4-6`, explicit `reasoning_effort=max` completed with
HTTP 200, `finish_reason=stop`, and router logs reported `THINK:max`.

For `ag/claude-opus-4-6-thinking`, explicit `reasoning_effort=max` completed
with HTTP 200 and the router translated it to Claude budget `THINK:128k`.
Literal wire `max` is preserved.

For `ag/gpt-oss-120b-medium`, explicit `reasoning_effort=max` completed with
HTTP 200, and the router logged `THINK:xhigh`. Matching explicit `xhigh`
completed with HTTP 200 and `THINK:xhigh`.

Client-facing `max` therefore means "the highest effort this route actually
applies," not a promise to transmit the literal string `max`.

OpenCode applies the mapping in its model defaults and request-parameter hook.
Title generation bypasses that hook, so the plugin pins OpenCode's small model
to the measured DeepSeek V4 Flash path instead of letting each selected model
receive an internal lower-effort request.

## Capability invariants

Effort is only half of the catalog contract: modality is the other. The router
derives `vision` from its own hand-written tables and name heuristics, and a
table gap silently drops image input without throwing. `cbcn/deepseek-v4.1-flash`
regressed this way — the CodeBuddy CN table had no exact entry, so the id fell
through to the generic `*deepseek-v4*` pattern (no `vision`), and both client
projections emitted `input: ["text"]` even though V4.1-Flash ships a natively
trained DeepSeek-ViT vision encoder. `src/invariants.ts` records that fact (and
similar externally verifiable ones) so `pnpm check:catalog` fails instead of
silently degrading a model.

When adding a model whose modality or reasoning support is externally
verifiable, add an invariant entry alongside the effort measurement. Run
`pnpm check:catalog` after any router, CodeBuddy, or connection-set change.

Re-fetch the live catalog and repeat `max` first whenever 9Router, CodeBuddy,
the active connection set, or one of these model revisions changes. Retry
`xhigh` only when `max` fails or is demonstrably normalized or ignored. An
unmeasured active reasoning model remains visible without an explicit effort so
one new catalog record cannot hide either provider; `pnpm check:catalog` fails
loudly until that probe is complete.
