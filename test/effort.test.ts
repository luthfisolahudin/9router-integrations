import assert from "node:assert/strict";
import test from "node:test";

import { highestWireEffort, MEASURED_WIRE_EFFORT } from "../src/effort.ts";

test("maps every measured model to xhigh", () => {
	assert.equal(Object.keys(MEASURED_WIRE_EFFORT).length, 5);
	for (const id of Object.keys(MEASURED_WIRE_EFFORT)) assert.equal(highestWireEffort(id), "xhigh");
});

test("fails closed for an unmeasured model", () => {
	assert.throws(() => highestWireEffort("cbcn/future-model"), /No measured 9Router effort/);
});
