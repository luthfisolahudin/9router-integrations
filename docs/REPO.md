# Vendor notes — 9Router

Repo-owned. Things a future reader would otherwise rediscover the hard way.

- Root: `http://127.0.0.1:20128`, API base `/v1`, default key `sk_9router`
  (override the key with `NINE_ROUTER_API_KEY` and the root with `NINE_ROUTER_BASE_URL`).
- Catalog: `GET /v1/models`, `{object, data[]}`, self-describing capabilities
  including `thinkingFormat`, `thinkingCanDisable` and a `thinkingRange` that is
  always `null`.
- **Ids are `owner/slug`.** Owners are a routing family, not a vendor:
  `cbcn` CodeBuddy CN, `cx` OpenAI Codex, `ag` Antigravity, `oc`/`mmf` other
  connections. Labels are derived from the slug plus the owner map in
  `packages/provider/src/pack.ts`.
- **Four ids never reach a picker**: `cbcn/kimi-k3-1`, `cbcn/deepseek-v4-pro`,
  `cbcn/deepseek-v4-flash`, `cx/codex-auto-review` (retired or internal). They are
  excluded by id, not by pattern.
- **The router normalises effort.** A request may be answered at a lower level than
  asked. That is why the effort table is measured per route and why an entry can be
  `xhigh` even though the client asked for `max`.
- **Title turns bypass request hooks.** OpenCode's small model is pinned to
  `cbcn/deepseek-v4.1-flash` in the pack's host hints for that reason.
- The router only exists on the machine that runs it (`thunk`), so the committed
  fixture is the CI surface; `task check:catalog -- --live` needs the router up.
- **Quota labels are window-only.** T3's HTTP quota source has no model-scoping
  field, so `packages/provider/src/quota.ts` appends the provider as a suffix in
  each `window.label` (`Gemini Session · Antigravity`) and drops the image/embedding
  window, which is not a chat quota. Account labels stay verbatim for the Usage page.
