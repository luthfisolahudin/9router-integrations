import assert from "node:assert/strict";
import { test } from "node:test";

import { displayName } from "../src/index.ts";

test("brands get their own casing, versions stay upper-case", () => {
	assert.equal(displayName("deepseek-v4.1-flash"), "DeepSeek V4.1 Flash");
	assert.equal(displayName("glm-5.3-flashx"), "GLM 5.3 Flashx");
});

test("an owner prefix becomes a parenthesised suffix", () => {
	assert.equal(displayName("cbcn/kimi-k3"), "Kimi K3 (cbcn)");
	assert.equal(displayName("cbcn/kimi-k3", { owners: { cbcn: "CodeBuddy CN" } }), "Kimi K3 (CodeBuddy CN)");
});

test("full-id overrides win", () => {
	assert.equal(displayName("ag/claude-opus-4-6-thinking", { names: { "ag/claude-opus-4-6-thinking": "Claude Opus 4.6" } }), "Claude Opus 4.6");
});

test("repeated separators never produce a whitespace-only label", () => {
	assert.equal(displayName("kimi--k3"), "Kimi K3");
	assert.equal(displayName("-k3-"), "K3");
});

test("a slug-less id degrades to the raw id", () => {
	assert.equal(displayName("vendor/"), "vendor/");
	assert.equal(displayName("---"), "---");
});

test("vendor brands override defaults", () => {
	assert.equal(displayName("mimo-v2.6-pro", { brands: { mimo: "MiMo" } }), "MiMo V2.6 Pro");
});
