import assert from "node:assert/strict";
import { test } from "node:test";

import { nineRouterPack } from "../src/index.ts";
import { capabilityView } from "../../../engine/contract/capabilities.ts";

// The router publishes the selectable effort levels on `thinking_levels`, next to the
// `capabilities` block. The committed fixture is a capture that predates that field, so
// the mapping is asserted here against a record shaped like the live catalog rather
// than injected into the capture.
const record = {
	id: "ag/gemini-4-argon-high",
	object: "model",
	owned_by: "ag",
	capabilities: {
		vision: true,
		reasoning: true,
		thinkingFormat: "gemini-level",
		thinkingCanDisable: false,
		contextWindow: 1048576,
		maxOutput: 65536,
	},
	context_length: 1048576,
	max_completion_tokens: 65536,
	thinking_levels: ["low", "medium", "high"],
};

test("the pack reads effort levels from thinking_levels", () => {
	const view = capabilityView(record, nineRouterPack.fields);
	assert.deepEqual(view.declaredEfforts, ["low", "medium", "high"]);
	assert.equal(view.thinkingFormat, "gemini-level");
	assert.equal(view.thinkingCanDisable, false);
});

test("a catalog without thinking_levels yields no declared menu", () => {
	const { thinking_levels: _, ...withoutLevels } = record;
	const view = capabilityView(withoutLevels, nineRouterPack.fields);
	assert.equal(view.declaredEfforts, undefined);
});
