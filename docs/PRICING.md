# Pricing

Three places can hold a price, and they are not interchangeable.

## 1. models.dev (the default source)

The engine reads `input`, `output`, `cache_read`, `cache_write` from the
models.dev entry for a model and treats them as **USD per 1M tokens**. When
models.dev does not publish the model, cost is zero and
`provenance.pricing = "default"`.

That price is a hint, not a billing contract: models.dev lists the same model
once per gateway, so the engine takes the most common published value and any
gateway markup is invisible. `task report --write` shows `cost/1M` and
`effort-src`/`limits-src` provenance, so a zero is visible rather than implied.

## 2. The pack (per model, authoritative)

Two pack fields exist for the cases models.dev cannot serve:

```ts
// packages/provider/src/pack.ts
aliases: {
  // The provider names it differently; look up the models.dev entry by this key.
  "deepseek-v4.1-flash-uncensored": "deepseek-v4.1-flash",
},
curated: {
  // An explicit price. Wins over models.dev, and is recorded as `curated`.
  "my-local-model": { cost: { input: 0.2, output: 0.8 } },
},
```

Order: `curated.cost` → models.dev (via `aliases` if present) → zero. Fields a
curated entry omits stay zero; they are not borrowed from the aliased entry,
because a partial price is still a guess in the field that was omitted.

An alias also redirects limits, modalities and reasoning, since it changes the
metadata lookup key, not just the price. It never adds membership: a model that
is not in the provider catalog stays absent.

Do not put an aggregator's own price field in a pack. CosmoHub publishes none;
GutsAI publishes `price_per_1m` in **IDR, blended in/out**, which cannot be
mapped honestly into four USD fields.

## 3. T3 Code (what actually bills)

T3 Code keeps its own overrides in `~/.t3/userdata/settings.json`. Verified
shape on this machine:

```jsonc
{
  "usagePriceOverrides": {
    "cosmoshub/deepseek-v4.1-flash": {
      "inputCostPerMillionTokens": 0.3,
      "outputCostPerMillionTokens": 1.2,
      "cacheReadCostPerMillionTokens": 0.006
    }
  },
  "usageModelAliases": {
    "cosmoshub/kimi-k3.1-pro": "kimi-k3.1-pro"
  }
}
```

- the key is `<providerId>/<modelId>`, exactly as the harness reports it;
- `usageModelAliases` maps that key to a canonical model id so one model served
  by several gateways aggregates into one usage row;
- `~/.t3/userdata/usage-model-rates.json` is a fetched rate table (LiteLLM
  style, per-token) used as a fallback source; it is a cache, not yours to edit.

Two consequences for this repo:

1. **Never normalize a model id.** Aliases are keyed by the id the harness sees,
   so renaming `deepseek-v4.1-flash-1017` to `deepseek-v4.1-flash` would silently
   split or merge usage rows.
2. **A zero cost in the picker is not a bug.** It means nobody published a price
   for that exact id; add an override in T3 Code, or curate it in the pack when
   the price is stable and known.

The settings file is the source of truth. T3 Code applies it without restarting
the harness, and any settings panel in the app writes the same keys. Edit the
file when you want a change that survives a reinstall of the app.
