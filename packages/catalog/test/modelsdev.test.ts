import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLimitIndex, modelKey, normalizeModelKey } from "../src/index.ts";

function catalog(): unknown {
	return {
		first: { models: { "gpt-5.4": { limit: { context: 400_000, output: 32_000 } } } },
		second: { models: { "gpt-5.4": { limit: { context: 1_050_000, output: 128_000 } } } },
		third: { models: { "gpt-5.4": { limit: { context: 1_050_000, output: 64_000 } } } },
		// a clipped copy with its own output cap must not leak into the winner
		fourth: { models: { "gpt-5.4": { limit: { context: 400_000, output: 999_999 } } } },
	};
}

test("the majority window wins, not the first seen", () => {
	const index = buildLimitIndex(catalog());
	assert.deepEqual(index.get("gpt-5.4"), { contextWindow: 1_050_000, maxOutput: 128_000 });
});

test("output caps are counted only for the winning window", () => {
	const index = buildLimitIndex({
		a: { models: { m: { limit: { context: 100_000, output: 8_000 } } } },
		b: { models: { m: { limit: { context: 200_000, output: 4_000 } } } },
		c: { models: { m: { limit: { context: 200_000, output: 4_000 } } } },
	});
	assert.deepEqual(index.get("m"), { contextWindow: 200_000, maxOutput: 4_000 });
});

test("ties go to the larger value", () => {
	const index = buildLimitIndex({
		a: { models: { m: { limit: { context: 100_000, output: 1_000 } } } },
		b: { models: { m: { limit: { context: 200_000, output: 2_000 } } } },
	});
	assert.equal(index.get("m")?.contextWindow, 200_000);
});

test("gateway prefixes and free tags still resolve", () => {
	const index = buildLimitIndex({
		a: { models: { "vendor/kimi-k3": { limit: { context: 1_000_000, output: 131_072 } } } },
		b: { models: { "kimi-k3:free": { limit: { context: 1_000_000, output: 131_072 } } } },
	});
	assert.equal(index.get("kimi-k3")?.contextWindow, 1_000_000);
	assert.equal(modelKey("CommandCode/MiniMaxAI/MiniMax-M3"), "minimax-m3");
	assert.equal(normalizeModelKey("Kimi-K3-20260101"), "kimi-k3");
});

test("entries without limits are ignored, and an absent model returns undefined", () => {
	const index = buildLimitIndex({ a: { models: { m: { limit: {} }, n: {} } } });
	assert.equal(index.size, 0);
	assert.equal(index.get("m"), undefined);
	assert.equal(index.get("absent"), undefined);
});

test("a non-object catalog yields an empty index instead of throwing", () => {
	assert.equal(buildLimitIndex(null).size, 0);
	assert.equal(buildLimitIndex([]).size, 0);
});
