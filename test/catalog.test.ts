import assert from "node:assert/strict";
import test from "node:test";

import { displayName, fetchCatalog, parseCatalog, resolveApiBaseUrl, resolveApiKey, resolveBaseUrl } from "../src/catalog.ts";
import { catalogFixture, mockFetch } from "./helpers.ts";

test("preserves exact catalog membership while excluding dropped models", () => {
	const records = parseCatalog({
		data: [
			{ id: "cbcn/glm-5.3" },
			{ id: "cbcn/kimi-k3" },
			{ id: "cbcn/deepseek-v4-flash" },
			{ id: "cx/codex-auto-review" },
		],
	});
	assert.deepEqual(records.map(({ id }) => id), ["cbcn/glm-5.3", "cbcn/kimi-k3"]);
});

test("rejects malformed and duplicate records instead of dropping them", () => {
	assert.throws(() => parseCatalog({ data: [{ id: "cbcn/glm-5.3" }, {}] }), /usable id/);
	assert.throws(() => parseCatalog({ data: [{ id: "same" }, { id: "same" }] }), /duplicate/);
	assert.throws(() => parseCatalog({ data: [{ id: "cbcn/glm-5.3" }, "not-an-object"] }), /non-object/);
	assert.throws(() => parseCatalog({ data: [{ id: "   " }] }), /usable id/);
	assert.throws(() => parseCatalog({}), /no model records/);
	assert.throws(() => parseCatalog({ data: "not-an-array" }), /no model records/);
	assert.throws(() => parseCatalog("not-a-catalog"), /no model records/);
});

test("accepts every catalog envelope shape without changing membership", () => {
	assert.deepEqual(parseCatalog({ data: [{ id: "a" }, { id: "b" }] }).map(({ id }) => id), ["a", "b"]);
	assert.deepEqual(parseCatalog({ models: [{ id: "a" }, { id: "b" }] }).map(({ id }) => id), ["a", "b"]);
	assert.deepEqual(parseCatalog([{ id: "a" }, { id: "b" }]).map(({ id }) => id), ["a", "b"]);
	assert.deepEqual(parseCatalog({ id: "single" }).map(({ id }) => id), ["single"]);
});

test("trims ids while keeping the rest of the record intact", () => {
	const [record] = parseCatalog({ data: [{ id: "  cx/gpt-5.5  ", capabilities: { reasoning: true } }] });
	assert.equal(record.id, "cx/gpt-5.5");
	assert.deepEqual(record.capabilities, { reasoning: true });
});

test("fails discovery with distinct errors for HTTP, JSON, and network failures", async () => {
	const cases: Array<[typeof globalThis.fetch, RegExp]> = [
		[async () => new Response("nope", { status: 503 }), /HTTP 503/],
		[async () => new Response("<html>not json</html>", { status: 200 }), /invalid JSON/],
		[
			async () => {
				throw new Error("connection refused");
			},
			/discovery request failed/,
		],
	];
	for (const [handler, pattern] of cases) {
		const restore = mockFetch(handler);
		try {
			await assert.rejects(fetchCatalog({ baseUrl: "http://127.0.0.1:20128" }), pattern);
		} finally {
			restore();
		}
	}
});

test("honors an external abort even when the network error is generic", async () => {
	const controller = new AbortController();
	const restore = mockFetch(async () => {
		throw new Error("socket hang up");
	});
	try {
		controller.abort();
		await assert.rejects(fetchCatalog({ baseUrl: "http://127.0.0.1:20128", signal: controller.signal }), /discovery was aborted/);
	} finally {
		restore();
	}
});

test("passes a combined signal so either an external abort or the timeout fires", async () => {
	const controller = new AbortController();
	let seen: AbortSignal | null | undefined;
	const restore = mockFetch(async (_input, init) => {
		seen = init?.signal;
		// Simulate a hung server: settle only when the combined signal fires
		// (either leg), so the test does not leak a pending promise.
		return await new Promise<Response>((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () => reject(new Error("signaled")), { once: true });
		});
	});
	try {
		const pending = fetchCatalog({
			baseUrl: "http://127.0.0.1:20128",
			signal: controller.signal,
			timeoutMs: 20,
		});
		assert.equal(seen instanceof AbortSignal, true);
		// The timeout leg must reject the hung fetch on its own while the
		// external controller stays live the whole time.
		await assert.rejects(pending, /discovery request failed/);
		assert.equal(controller.signal.aborted, false);
		// Aborting after settle must not throw from any lingering listener.
		controller.abort();
	} finally {
		restore();
	}
});

test("rejects immediately when the external signal is already aborted", async () => {
	const controller = new AbortController();
	controller.abort();
	const restore = mockFetch(async () => {
		throw new Error("fetch must not be reached");
	});
	try {
		await assert.rejects(fetchCatalog({ baseUrl: "http://127.0.0.1:20128", signal: controller.signal }), /discovery was aborted/);
	} finally {
		restore();
	}
});

test("normalizes root and v1 URLs for discovery and OpenAI API calls", async () => {
	assert.equal(resolveBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128");
	assert.equal(resolveApiBaseUrl("http://127.0.0.1:20128"), "http://127.0.0.1:20128/v1");
	assert.equal(resolveApiBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128/v1");

	let request: Request | undefined;
	const restoreFetch = mockFetch(async (input, init) => {
		request = new Request(input, init);
		return new Response(catalogFixture({ id: "cx/gpt-5.6-terra" }), { status: 200 });
	});
	try {
		await fetchCatalog({ baseUrl: "http://127.0.0.1:20128/v1/", apiKey: "test-key" });
		assert.equal(request?.url, "http://127.0.0.1:20128/v1/models");
		assert.equal(request?.headers.get("Authorization"), "Bearer test-key");
	} finally {
		restoreFetch();
	}
});

test("renders friendly names for the active catalog", () => {
	assert.equal(displayName("cbcn/minimax-m3"), "MiniMax M3 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/glm-5.3"), "GLM 5.3 (CodeBuddy CN)");
	assert.equal(displayName("cbcn/glm-5.3-flash"), "GLM 5.3 Flash (CodeBuddy CN)");
	assert.equal(displayName("cbcn/deepseek-v4.1-flash"), "DeepSeek V4.1 Flash (CodeBuddy CN)");
	assert.equal(displayName("cbcn/kimi-k3"), "Kimi K3 (CodeBuddy CN)");
	assert.equal(displayName("cx/gpt-6-astra"), "GPT 6 Astra (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.6-sol"), "GPT 5.6 Sol (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.6-terra"), "GPT 5.6 Terra (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.6-luna"), "GPT 5.6 Luna (OpenAI Codex)");
	assert.equal(displayName("cx/gpt-5.5"), "GPT 5.5 (OpenAI Codex)");
	assert.equal(displayName("ag/gemini-3.8-flash-high"), "Gemini 3.8 Flash (Antigravity)");
	assert.equal(displayName("ag/claude-sonnet-4-6"), "Claude Sonnet 4.6 (Antigravity)");
	assert.equal(displayName("ag/claude-opus-4-6-thinking"), "Claude Opus 4.6 (Antigravity)");
	assert.equal(displayName("ag/gpt-oss-120b-medium"), "GPT OSS 120B (Antigravity)");
});

test("degrades gracefully on unknown owners, slugs, and missing prefixes", () => {
	assert.equal(displayName("acme/foo-bar"), "Foo Bar (acme)");
	assert.equal(displayName("orphan-model"), "Orphan Model");
});

test("never renders an empty picker label for partial ids", () => {
	assert.equal(displayName(""), "");
	assert.equal(displayName("/"), "/");
	assert.equal(displayName("/b"), "B");
	assert.equal(displayName("a/"), "a/");
});

test("normalizes noisy base URLs and rejects whitespace-only ids", async () => {
	assert.equal(resolveBaseUrl("  http://127.0.0.1:20128/v1  "), "http://127.0.0.1:20128");
	assert.equal(resolveApiBaseUrl("http://127.0.0.1:20128/V1"), "http://127.0.0.1:20128/v1");
	assert.throws(() => parseCatalog({ data: [{ id: "   " }] }), /usable id/);
	assert.deepEqual(parseCatalog({ data: [{ id: "  cbcn/glm-5.3  " }] }).map(({ id }) => id), ["cbcn/glm-5.3"]);
});

test("prefers explicit arguments over env, then env over defaults", () => {
	const originalUrl = process.env.NINE_ROUTER_BASE_URL;
	const originalKey = process.env.NINE_ROUTER_API_KEY;
	process.env.NINE_ROUTER_BASE_URL = "http://10.0.0.5:20128/v1/";
	process.env.NINE_ROUTER_API_KEY = "env-key";
	try {
		assert.equal(resolveBaseUrl(), "http://10.0.0.5:20128");
		assert.equal(resolveApiBaseUrl(), "http://10.0.0.5:20128/v1");
		assert.equal(resolveApiKey(), "env-key");
		assert.equal(resolveBaseUrl("http://127.0.0.1:20128"), "http://127.0.0.1:20128");
		assert.equal(resolveApiKey("explicit-key"), "explicit-key");
		assert.equal(resolveBaseUrl(undefined), "http://10.0.0.5:20128");
	} finally {
		if (originalUrl === undefined) delete process.env.NINE_ROUTER_BASE_URL;
		else process.env.NINE_ROUTER_BASE_URL = originalUrl;
		if (originalKey === undefined) delete process.env.NINE_ROUTER_API_KEY;
		else process.env.NINE_ROUTER_API_KEY = originalKey;
	}
});

test("falls back to defaults when env is unset", () => {
	const originalUrl = process.env.NINE_ROUTER_BASE_URL;
	const originalKey = process.env.NINE_ROUTER_API_KEY;
	delete process.env.NINE_ROUTER_BASE_URL;
	delete process.env.NINE_ROUTER_API_KEY;
	try {
		assert.equal(resolveBaseUrl(), "http://127.0.0.1:20128");
		assert.equal(resolveApiBaseUrl(), "http://127.0.0.1:20128/v1");
		assert.equal(resolveApiKey(), "sk_9router");
	} finally {
		if (originalUrl !== undefined) process.env.NINE_ROUTER_BASE_URL = originalUrl;
		if (originalKey !== undefined) process.env.NINE_ROUTER_API_KEY = originalKey;
	}
});
