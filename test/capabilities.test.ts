import assert from "node:assert/strict";
import test from "node:test";

import { capabilityView } from "../src/capabilities.ts";

test("maps a measured reasoning model to its wire effort", () => {
	const view = capabilityView({ id: "cbcn/minimax-m3", capabilities: { reasoning: true } });
	assert.equal(view.reasoning, true);
	assert.equal(view.effort, "xhigh");
});

test("gates effort behind reasoning even for a measured model", () => {
	const view = capabilityView({ id: "cbcn/minimax-m3", capabilities: { reasoning: false } });
	assert.equal(view.reasoning, false);
	assert.equal(view.effort, undefined);
});

test("reads modality flags with strict equality", () => {
	const view = capabilityView({
		id: "cbcn/kimi-k3",
		capabilities: { vision: true, audioInput: true, videoInput: true, pdf: true, imageOutput: true, audioOutput: true },
	});
	assert.equal(view.vision, true);
	assert.equal(view.audioInput, true);
	assert.equal(view.videoInput, true);
	assert.equal(view.pdf, true);
	assert.equal(view.imageOutput, true);
	assert.equal(view.audioOutput, true);
});

test("treats missing, null, and truthy-but-not-boolean flags as false", () => {
	const view = capabilityView({ id: "cbcn/kimi-k3", capabilities: { vision: "yes", reasoning: 1 } });
	assert.equal(view.vision, false);
	assert.equal(view.reasoning, false);
	assert.equal(view.effort, undefined);
	const empty = capabilityView({ id: "cbcn/kimi-k3" });
	assert.equal(empty.vision, false);
	assert.equal(empty.audioOutput, false);
});

test("keeps tools tri-state instead of coercing to false", () => {
	assert.equal(capabilityView({ id: "m", capabilities: { tools: true } }).tools, true);
	assert.equal(capabilityView({ id: "m", capabilities: { tools: false } }).tools, false);
	assert.equal(capabilityView({ id: "m", capabilities: {} }).tools, undefined);
	assert.equal(capabilityView({ id: "m" }).tools, undefined);
});

test("passes numeric limits through and leaves fallbacks to the clients", () => {
	const view = capabilityView({ id: "m", capabilities: { contextWindow: 272_000, maxOutput: 128_000 } });
	assert.equal(view.contextWindow, 272_000);
	assert.equal(view.maxOutput, 128_000);
});

test("drops non-number and non-finite limits instead of inventing defaults", () => {
	// `typeof NaN === "number"`, so the view must filter on Number.isFinite to
	// keep a broken router payload from reaching OpenCode's `limit` as NaN.
	const view = capabilityView({ id: "m", capabilities: { contextWindow: "272k", maxOutput: Number.NaN } });
	assert.equal(view.contextWindow, undefined);
	assert.equal(view.maxOutput, undefined);
	assert.equal(
		capabilityView({ id: "m", capabilities: { contextWindow: Number.POSITIVE_INFINITY } }).contextWindow,
		undefined,
	);
});

test("drops non-positive limits that are otherwise finite", () => {
	// A zero or negative limit is a broken router value, not a real budget.
	const view = capabilityView({ id: "m", capabilities: { contextWindow: 0, maxOutput: -5 } });
	assert.equal(view.contextWindow, undefined);
	assert.equal(view.maxOutput, undefined);
	assert.equal(capabilityView({ id: "m", capabilities: { contextWindow: 1 } }).contextWindow, 1);
});
