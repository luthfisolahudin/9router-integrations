import assert from "node:assert/strict";
import test from "node:test";

import {
	CAPABILITY_INVARIANTS,
	checkCapabilityInvariants,
} from "../src/invariants.ts";

test("passes when a curated multimodal model reports its expected capabilities", () => {
	const result = checkCapabilityInvariants([
		{ id: "cbcn/deepseek-v4.1-flash", capabilities: { vision: true, reasoning: true, tools: true } },
	]);
	assert.deepEqual(result.violations, []);
	assert.deepEqual(result.absent, CAPABILITY_INVARIANTS.map(({ id }) => id).filter((id) => id !== "cbcn/deepseek-v4.1-flash"));
});

test("catches a dropped vision flag even though the projection never throws", () => {
	const result = checkCapabilityInvariants([
		{ id: "cbcn/deepseek-v4.1-flash", capabilities: { vision: false, reasoning: true, tools: true } },
	]);
	assert.equal(result.violations.length, 1);
	assert.match(result.violations[0], /cbcn\/deepseek-v4\.1-flash: capabilities\.vision is false, expected true/);
});

test("treats a missing curated model as absent, not as a violation", () => {
	const result = checkCapabilityInvariants([{ id: "cbcn/glm-5.3", capabilities: { vision: true, reasoning: true } }]);
	assert.deepEqual(result.violations, []);
	assert.ok(result.absent.includes("cbcn/deepseek-v4.1-flash"));
});

test("tolerates a missing capabilities block without crashing", () => {
	const result = checkCapabilityInvariants([{ id: "cbcn/deepseek-v4.1-flash" }]);
	assert.equal(result.violations.length, 3);
	assert.match(result.violations[0], /capabilities\.vision is undefined, expected true/);
});
