import assert from "node:assert/strict";
import test from "node:test";

import { measuredWireEffort, MEASURED_WIRE_EFFORT } from "../src/effort.ts";

test("maps every measured model to its highest observed route effort", () => {
	assert.equal(Object.keys(MEASURED_WIRE_EFFORT).length, 14);
	for (const id of Object.keys(MEASURED_WIRE_EFFORT)) {
		assert.equal(measuredWireEffort(id), MEASURED_WIRE_EFFORT[id as keyof typeof MEASURED_WIRE_EFFORT]);
	}
	assert.equal(measuredWireEffort("cbcn/deepseek-v4.1-flash"), "xhigh");
	assert.equal(measuredWireEffort("cbcn/glm-5.3"), "xhigh");
	assert.equal(measuredWireEffort("cbcn/kimi-k3"), "xhigh");
	assert.equal(measuredWireEffort("cx/gpt-6-astra"), "xhigh");
	assert.equal(measuredWireEffort("cx/gpt-5.6-sol"), "xhigh");
	assert.equal(measuredWireEffort("cx/gpt-5.5"), "xhigh");
	assert.equal(measuredWireEffort("ag/gemini-3.8-flash-high"), "max");
	assert.equal(measuredWireEffort("ag/claude-sonnet-4-6"), "max");
	assert.equal(measuredWireEffort("ag/claude-opus-4-6-thinking"), "max");
	assert.equal(measuredWireEffort("ag/gpt-oss-120b-medium"), "max");
});

test("returns undefined for an unmeasured or stale model", () => {
	assert.equal(measuredWireEffort("cbcn/future-model"), undefined);
	assert.equal(measuredWireEffort("cbcn/deepseek-v4-flash"), undefined);
	assert.equal(measuredWireEffort("cbcn/kimi-k3-1"), undefined);
	assert.equal(measuredWireEffort("cbcn/glm-5.2"), undefined);
	assert.equal(measuredWireEffort("ag/gemini-3.7-flash-high"), undefined);
});
