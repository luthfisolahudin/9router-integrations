import assert from "node:assert/strict";
import test from "node:test";

import registerNineRouter, { toPiModel } from "../extensions/pi.ts";

test("exposes only client-facing max mapped to xhigh", () => {
	const model = toPiModel({ id: "cbcn/kimi-k3", capabilities: { reasoning: true } });
	assert.deepEqual(model.thinkingLevelMap, {
		off: null,
		minimal: null,
		low: null,
		medium: null,
		high: null,
		xhigh: null,
		max: "xhigh",
	});
});

test("registers only the pinned startup fallback before refresh", () => {
	let captured: unknown;
	registerNineRouter({ registerProvider: (_id: string, config: unknown) => (captured = config) } as never);
	const provider = captured as { models: Array<{ id: string }>; refreshModels: unknown };
	assert.deepEqual(provider.models.map(({ id }) => id), ["cbcn/deepseek-v4-flash"]);
	assert.equal(typeof provider.refreshModels, "function");
});
