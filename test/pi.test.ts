import assert from "node:assert/strict";
import test from "node:test";

import registerNineRouter, { toPiModel } from "../extensions/pi.ts";
import { catalogFixture, mockFetch } from "./helpers.ts";

type RegisteredProvider = {
	api: string;
	apiKey: string;
	authHeader: boolean;
	baseUrl: string;
	models: Array<{
		compat?: Record<string, unknown>;
		contextWindow: number;
		id: string;
		input: string[];
		maxTokens: number;
		thinkingLevelMap?: Record<string, string | null>;
	}>;
	refreshModels: (context: { allowNetwork: boolean; signal: AbortSignal }) => Promise<RegisteredProvider["models"]>;
};

function registeredProvider(): RegisteredProvider {
	let captured: unknown;
	registerNineRouter({ registerProvider: (_id: string, config: unknown) => (captured = config) } as never);
	return captured as RegisteredProvider;
}

test("uses OpenAI reasoning fields for the measured client max map", () => {
	const model = toPiModel({ id: "cbcn/minimax-m3", capabilities: { reasoning: true } });
	assert.deepEqual(model.thinkingLevelMap, {
		off: null,
		minimal: null,
		low: null,
		medium: null,
		high: null,
		xhigh: null,
		max: "xhigh",
	});
	assert.deepEqual(model.compat, {
		requiresReasoningContentOnAssistantMessages: true,
		supportsReasoningEffort: true,
		thinkingFormat: "openai",
	});
});

test("keeps an unmeasured reasoning model visible without forcing effort", () => {
	const model = toPiModel({ id: "ag/future-reasoning-model", capabilities: { reasoning: true } });
	assert.equal(model.reasoning, true);
	assert.equal(model.thinkingLevelMap, undefined);
	assert.equal(model.compat, undefined);
});

test("registers the OpenAI Chat Completions provider with pinned fallbacks", () => {
	const provider = registeredProvider();
	assert.equal(provider.api, "openai-completions");
	assert.equal(provider.baseUrl, "http://127.0.0.1:20128/v1");
	assert.equal(provider.authHeader, true);
	assert.notEqual(provider.apiKey.length, 0);
	assert.deepEqual(provider.models.map(({ id }) => id), ["cbcn/deepseek-v4.1-flash", "cx/gpt-5.6-terra"]);
	assert.deepEqual(provider.models[1], {
		id: "cx/gpt-5.6-terra",
		name: "GPT 5.6 Terra (OpenAI Codex)",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 272_000,
		maxTokens: 128_000,
		thinkingLevelMap: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: null,
			xhigh: null,
			max: "xhigh",
		},
		compat: {
			requiresReasoningContentOnAssistantMessages: true,
			supportsReasoningEffort: true,
			thinkingFormat: "openai",
		},
	});
});

test("retains fallbacks offline and replaces them with the exact live catalog", async () => {
	let fetches = 0;
	let requestSignal: AbortSignal | null | undefined;
	const restoreFetch = mockFetch(async (_input, init) => {
		fetches += 1;
		requestSignal = init?.signal;
		return new Response(
			catalogFixture(
				{ id: "cx/gpt-5.6-terra", capabilities: { reasoning: true } },
				{ id: "cbcn/glm-5.3", capabilities: { reasoning: true } },
				{ id: "ag/claude-sonnet-4-6", capabilities: { reasoning: true } },
				{ id: "ag/claude-opus-4-6-thinking", capabilities: { reasoning: true } },
				{ id: "ag/gpt-oss-120b-medium", capabilities: { reasoning: true } },
			),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			},
		);
	});
	try {
		const provider = registeredProvider();
		const signal = new AbortController().signal;
		const offline = await provider.refreshModels({ allowNetwork: false, signal });
		assert.equal(fetches, 0);
		assert.deepEqual(offline.map(({ id }) => id), ["cbcn/deepseek-v4.1-flash", "cx/gpt-5.6-terra"]);

		const live = await provider.refreshModels({ allowNetwork: true, signal });
		assert.equal(requestSignal?.aborted, false);
		assert.equal(fetches, 1);
		assert.deepEqual(live.map(({ id }) => id), [
			"cx/gpt-5.6-terra",
			"cbcn/glm-5.3",
			"ag/claude-sonnet-4-6",
			"ag/claude-opus-4-6-thinking",
			"ag/gpt-oss-120b-medium",
		]);
		assert.deepEqual((await provider.refreshModels({ allowNetwork: false, signal })).map(({ id }) => id), [
			"cx/gpt-5.6-terra",
			"cbcn/glm-5.3",
			"ag/claude-sonnet-4-6",
			"ag/claude-opus-4-6-thinking",
			"ag/gpt-oss-120b-medium",
		]);
		assert.equal(fetches, 1);
	} finally {
		restoreFetch();
	}
});

test("aborts a Pi catalog refresh through its signal", async () => {
	let requestSignal: AbortSignal | null | undefined;
	const restoreFetch = mockFetch(async (_input, init) =>
		await new Promise<Response>((_resolve, reject) => {
			requestSignal = init?.signal;
			requestSignal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
		})
	);
	try {
		const controller = new AbortController();
		const refresh = registeredProvider().refreshModels({ allowNetwork: true, signal: controller.signal });
		await new Promise((resolve) => setTimeout(resolve, 0));
		assert.equal(requestSignal?.aborted, false);
		controller.abort();
		await assert.rejects(refresh, /discovery was aborted/);
	} finally {
		restoreFetch();
	}
});

test("does not fetch when the Pi refresh signal is already aborted", async () => {
	let fetches = 0;
	const restoreFetch = mockFetch(async () => {
		fetches += 1;
		throw new Error("refresh must not fetch after abort");
	});
	try {
		const controller = new AbortController();
		controller.abort();
		const models = await registeredProvider().refreshModels({ allowNetwork: true, signal: controller.signal });
		assert.equal(fetches, 0);
		assert.deepEqual(models.map(({ id }) => id), ["cbcn/deepseek-v4.1-flash", "cx/gpt-5.6-terra"]);
	} finally {
		restoreFetch();
	}
});
