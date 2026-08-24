import assert from "node:assert/strict";
import test from "node:test";

import { displayName, fetchCatalog, parseCatalog, resolveApiBaseUrl, resolveBaseUrl } from "../src/catalog.ts";

test("preserves exact catalog membership", () => {
	const records = parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, { id: "cbcn/kimi-k3" }] });
	assert.deepEqual(records.map(({ id }) => id), ["cbcn/glm-5.2", "cbcn/kimi-k3"]);
});

test("rejects malformed and duplicate records instead of dropping them", () => {
	assert.throws(() => parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, {}] }), /usable id/);
	assert.throws(() => parseCatalog({ data: [{ id: "same" }, { id: "same" }] }), /duplicate/);
});

test("normalizes root and v1 URLs for discovery and OpenAI API calls", async () => {
	assert.equal(resolveBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128");
	assert.equal(resolveApiBaseUrl("http://127.0.0.1:20128"), "http://127.0.0.1:20128/v1");
	assert.equal(resolveApiBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128/v1");

	const originalFetch = globalThis.fetch;
	let request: Request | undefined;
	globalThis.fetch = async (input, init) => {
		request = new Request(input, init);
		return new Response(JSON.stringify({ data: [{ id: "cx/gpt-5.6-terra" }] }), { status: 200 });
	};
	try {
		await fetchCatalog({ baseUrl: "http://127.0.0.1:20128/v1/", apiKey: "test-key" });
		assert.equal(request?.url, "http://127.0.0.1:20128/v1/models");
		assert.equal(request?.headers.get("Authorization"), "Bearer test-key");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("renders friendly names for the active catalog", () => {
	assert.equal(displayName("cbcn/glm-5.2"), "GLM 5.2 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/minimax-m3"), "MiniMax M3 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/deepseek-v4-pro"), "DeepSeek V4 Pro (CodeBuddy CN)");
	assert.equal(displayName("cbcn/deepseek-v4-flash"), "DeepSeek V4 Flash (CodeBuddy CN)");
	assert.equal(displayName("cbcn/kimi-k3"), "Kimi K3 (CodeBuddy CN)");
	assert.equal(displayName("cx/gpt-5.6-sol"), "GPT 5.6 Sol (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.6-terra"), "GPT 5.6 Terra (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.6-luna"), "GPT 5.6 Luna (OpenAI Codex)");
});

test("degrades gracefully on unknown owners, slugs, and missing prefixes", () => {
	assert.equal(displayName("acme/foo-bar"), "Foo Bar (acme)");
	assert.equal(displayName("orphan-model"), "Orphan Model");
});
