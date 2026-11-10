# Evidence log

Every measured claim in this repo lands here: one line, with the date, the
command, and what was observed. If a line is missing, the claim does not exist.

## Format

```
- YYYY-MM-DD `<provider>/<model>`: <what was measured>, <observed signal>, <verdict>.
```

## API behaviour

- 2026-11-11 `example/example-chat-1`: `/chat/completions` accepts
  `reasoning_effort` and returns `usage.reasoning_tokens`; verdict pending a
  three-sample probe.

## Curated facts

- 2026-11-11 `example/example-chat-1`: 1M context, image input, tool calls —
  taken from the vendor's model page (`https://api.example.test/docs/models`),
  not from the catalog.

## Provider quirks

- 2026-11-11 `example`: `/models` returns `{object, data[]}`; the response has no
  ETag, so `discovery.etag` is off for this pack.
