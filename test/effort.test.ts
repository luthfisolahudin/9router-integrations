import assert from "node:assert/strict";
import test from "node:test";

import { highestWireEffort, MEASURED_WIRE_EFFORT } from "../src/effort.ts";

test("maps every measured model to its highest observed route effort", () => {
	assert.equal(Object.keys(MEASURED_WIRE_EFFORT).length, 8);
	for (const id of Object.keys(MEASURED_WIRE_EFFORT)) {
		assert.equal(highestWireEffort(id), MEASURED_WIRE_EFFORT[id as keyof typeof MEASURED_WIRE_EFFORT]);
	}
	assert.equal(highestWireEffort("cbcn/deepseek-v4-flash"), "xhigh");
	assert.equal(highestWireEffort("cx/gpt-5.6-sol"), "max");
});

test("fails closed for an unmeasured model", () => {
	assert.throws(() => highestWireEffort("cbcn/future-model"), /No measured 9Router effort/);
});
