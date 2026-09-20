import assert from "node:assert/strict";
import test from "node:test";

import { DROPPED_MODEL_IDS } from "../src/catalog.ts";
import { measuredWireEffort } from "../src/effort.ts";
import { STARTUP_FALLBACK } from "../src/fallback.ts";
import { CAPABILITY_INVARIANTS, checkCapabilityInvariants } from "../src/invariants.ts";

test("the pinned fallback never contradicts curated ground truth", () => {
	const { violations } = checkCapabilityInvariants(STARTUP_FALLBACK);
	assert.deepEqual(violations, [], "offline fallback capabilities contradict a curated invariant");
});

test("every fallback model is measured, not dropped, and invariant-covered", () => {
	for (const record of STARTUP_FALLBACK) {
		assert.equal(DROPPED_MODEL_IDS.has(record.id), false, `${record.id} is on the dropped list but pinned as a fallback`);
		assert.notEqual(measuredWireEffort(record.id), undefined, `${record.id} has no measured wire effort`);
		assert.ok(
			CAPABILITY_INVARIANTS.some((invariant) => invariant.id === record.id),
			`${record.id} has no curated capability invariant`,
		);
	}
});
