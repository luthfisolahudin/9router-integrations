import assert from "node:assert/strict";
import test from "node:test";

import { displayName, parseCatalog, resolveBaseUrl } from "../src/catalog.ts";

test("preserves exact catalog membership", () => {
	const records = parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, { id: "cbcn/kimi-k3" }] });
	assert.deepEqual(records.map(({ id }) => id), ["cbcn/glm-5.2", "cbcn/kimi-k3"]);
});

test("rejects malformed and duplicate records instead of dropping them", () => {
	assert.throws(() => parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, {}] }), /usable id/);
	assert.throws(() => parseCatalog({ data: [{ id: "same" }, { id: "same" }] }), /duplicate/);
});

test("normalizes base URLs with or without v1", () => {
	assert.equal(resolveBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128");
});

test("renders friendly names for the active catalog", () => {
	assert.equal(displayName("cbcn/glm-5.2"), "GLM 5.2 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/minimax-m3"), "MiniMax M3 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/deepseek-v4-pro"), "DeepSeek V4 Pro (CodeBuddy CN)");
	assert.equal(displayName("cbcn/deepseek-v4-flash"), "DeepSeek V4 Flash (CodeBuddy CN)");
	assert.equal(displayName("cbcn/kimi-k3"), "Kimi K3 (CodeBuddy CN)");
});

test("degrades gracefully on unknown owners, slugs, and missing prefixes", () => {
	assert.equal(displayName("acme/foo-bar"), "Foo Bar (acme)");
	assert.equal(displayName("orphan-model"), "Orphan Model");
});
