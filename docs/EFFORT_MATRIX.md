# 9Router effort matrix

Measured on 2026-08-02 through local 9Router and its CodeBuddy CN connection.
The live `/v1/models` response contained exactly these five models.

- `cbcn/glm-5.2`: client `max` -> wire `xhigh`
- `cbcn/minimax-m3`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-pro`: client `max` -> wire `xhigh`
- `cbcn/deepseek-v4-flash`: client `max` -> wire `xhigh`
- `cbcn/kimi-k3`: client `max` -> wire `xhigh`

For every model, an explicit `reasoning_effort=max` request completed but safe
9Router metadata reported `THINK:xhigh`, proving that `max` was normalized.
The matching explicit `xhigh` request completed with `finish_reason=stop` and
metadata reported `THINK:xhigh`. No hidden reasoning, credentials, or request
payloads were retained.

Client-facing `max` therefore means "the highest effort this route actually
applies," not a promise to transmit the literal string `max`.

Re-fetch the live catalog and repeat `max` first whenever 9Router, CodeBuddy,
the active connection set, or one of these model revisions changes. Retry
`xhigh` only when `max` fails or is demonstrably normalized or ignored. An
unmeasured active reasoning model must fail loudly until that probe is complete.
