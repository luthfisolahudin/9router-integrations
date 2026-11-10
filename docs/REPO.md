# Vendor notes

Repo-owned. Fill this when a provider has behaviour a future reader would
otherwise rediscover the hard way. `AGENTS.md` points here because it is the one
file that can change per repo without conflicting with the template.

## Template (replace this section after `task init`)

- Base URL: `https://api.example.test/v1`
- Key: `EXAMPLE_API_KEY`
- Quirks: unknown yet.

## What belongs here

- TLS or certificate oddities, and the flag that fixes them;
- whether `status: offline` is a real state or decoration;
- the currency and unit of any price field;
- routes other than `/chat/completions` that work;
- anything about model ids that changes between refreshes.
