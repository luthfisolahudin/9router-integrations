import assert from "node:assert/strict";
import test from "node:test";

import { highestWireEffort, measuredWireEffort, MEASURED_WIRE_EFFORT } from "../src/effort.ts";

test("maps every measured model to its highest observed route effort", () => {
	assert.equal(Object.keys(MEASURED_WIRE_EFFORT).length, 15);
	for (const id of Object.keys(MEASURED_WIRE_EFFORT)) {
		assert.equal(highestWireEffort(id), MEASURED_WIRE_EFFORT[id as keyof typeof MEASURED_WIRE_EFFORT]);
	}
	assert.equal(highestWireEffort("cbcn/deepseek-v4-flash"), "xhigh");
	assert.equal(highestWireEffort("cx/gpt-5.6-sol"), "max");
	assert.equal(highestWireEffort("ag/gemini-3.8-flash-high"), "max");
	assert.equal(highestWireEffort("ag/gemini-3.8-flash-medium"), "max");
	assert.equal(highestWireEffort("ag/gemini-3.8-flash-low"), "max");
	assert.equal(highestWireEffort("ag/gemini-3.7-flash-high"), "max");
	assert.equal(highestWireEffort("ag/claude-sonnet-4-6"), "max");
	assert.equal(highestWireEffort("ag/claude-opus-4-6-thinking"), "max");
	assert.equal(highestWireEffort("ag/gpt-oss-120b-medium"), "max");
});

test("fails closed for an unmeasured model", () => {
	assert.equal(measuredWireEffort("cbcn/future-model"), undefined);
	assert.throws(() => highestWireEffort("cbcn/future-model"), /No measured 9Router effort/);
});
