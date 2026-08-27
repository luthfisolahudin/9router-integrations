# 9Router effort matrix

Measured on 2026-08-03, 2026-08-25, and 2026-08-27 through local 9Router. The current
`/v1/models` response contains eleven active reasoning models; the effort
entries below cover those models plus the previously measured historical
record.

- `cbcn/glm-5.2`: client `max` -> wire `xhigh`
- `cbcn/minimax-m3`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-pro`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-flash`: client `max` -> wire `xhigh`
- `cbcn/kimi-k3`: client `max` -> wire `xhigh`
- `cx/gpt-5.6-sol`: client `max` -> wire `max`
- `cx/gpt-5.6-terra`: client `max` -> wire `max`
- `cx/gpt-5.6-luna`: client `max` -> wire `max`
- `ag/gemini-3.7-flash-high`: client `max` -> wire `max`
- `ag/claude-sonnet-4-6`: client `max` -> wire `max`
- `ag/claude-opus-4-6-thinking`: client `max` -> wire `max`
- `ag/gpt-oss-120b-medium`: client `max` -> wire `max`

Models with the `ag` owner prefix are labeled as Antigravity in client model pickers.

This is a compatibility-route matrix, not a claim about native provider
capability. Kimi K3 advertises native `max` support, but OpenCode, standalone Pi,
and tt Pi currently use 9Router's OpenAI Chat Completions route at
`<router-root>/v1`. That route was the measured boundary and normalized literal
`max` to `xhigh`.

Pi uses its `openai-completions` adapter with OpenAI `reasoning_effort` and
replays reasoning through `reasoning_content`. Kimi was also probed on
2026-08-03 through the historical `/v1/messages` Anthropic Messages transport
with adaptive thinking and `output_config.effort=max`. It completed successfully,
but 9Router still reported `THINK:xhigh`.

On 2026-08-24, standalone Pi, OpenCode, and a tracked tt worker each completed
exact text, read-tool, and generated-image turns through OpenAI Chat
Completions. All three read `TT OPENAI IMAGE 7429` exactly and completed with
requested Terra `max`. The Terra route exposes no safe metadata proving a
distinct effective effort beyond that requested wire value.

For the five CodeBuddy CN models, an explicit `reasoning_effort=max` request
completed but safe 9Router metadata reported `THINK:xhigh`, proving that `max`
was normalized. The matching explicit `xhigh` request completed with
`finish_reason=stop` and metadata reported `THINK:xhigh`.

For the three `cx` models, explicit `reasoning_effort=max` requests completed
with HTTP 200 and `finish_reason=stop`. The route exposed no safe effective-
effort metadata and gave no evidence that `max` was rejected, normalized, or
ignored, so the highest-first policy keeps literal `max`. No hidden reasoning,
credentials, or request payloads were retained.

For Claude Opus 4.6 Thinking, baseline and explicit `reasoning_effort=max`
requests completed with HTTP 200, `finish_reason=stop`, and the exact requested
text. The route exposed no safe effective-effort metadata or evidence of
normalization, so the highest-first policy keeps literal `max`.

For Claude Sonnet 4.6, baseline and explicit `reasoning_effort=max` requests
completed with HTTP 200, `finish_reason=stop`, and the exact requested text.
The route exposed no safe effective-effort metadata or evidence of
normalization, so the highest-first policy keeps literal `max`.

For GPT OSS 120B Medium, baseline and explicit `reasoning_effort=max` requests
completed with HTTP 200, `finish_reason=stop`, the exact requested text, and
OpenAI-format `reasoning_content`. The route exposed no safe effective-effort
metadata or evidence of normalization, so the highest-first policy keeps
literal `max`.

Client-facing `max` therefore means "the highest effort this route actually
applies," not a promise to transmit the literal string `max`.

OpenCode applies the mapping in its model defaults and request-parameter hook.
Title generation bypasses that hook, so the plugin pins OpenCode's small model
to the measured DeepSeek V4 Flash path instead of letting each selected model
receive an internal lower-effort request.

Re-fetch the live catalog and repeat `max` first whenever 9Router, CodeBuddy,
the active connection set, or one of these model revisions changes. Retry
`xhigh` only when `max` fails or is demonstrably normalized or ignored. An
unmeasured active reasoning model remains visible without an explicit effort so
one new catalog record cannot hide either provider; `pnpm check:catalog` fails
loudly until that probe is complete.
