import assert from "node:assert/strict";
import test from "node:test";

import type { Config } from "@opencode-ai/plugin";

import { NineRouterModels, toOpenCodeModel } from "../plugins/opencode.ts";
import { catalogFixture, mockFetch } from "./helpers.ts";

test("keeps an unmeasured reasoning model visible without forcing effort", () => {
	const model = toOpenCodeModel({ id: "ag/future-reasoning-model", capabilities: { reasoning: true } });
	assert.equal(model.reasoning, true);
	assert.equal("variants" in model, false);
	assert.equal("options" in model, false);
});

test("projects exactly the live records with one max variant", async () => {
	const restoreFetch = mockFetch(async () =>
		new Response(
			catalogFixture(
				{ id: "cbcn/glm-5.3", capabilities: { reasoning: true } },
				{ id: "cx/gpt-5.5", capabilities: { reasoning: true } },
				{ id: "ag/claude-sonnet-4-6", capabilities: { reasoning: true } },
				{ id: "ag/claude-opus-4-6-thinking", capabilities: { reasoning: true } },
				{ id: "ag/gpt-oss-120b-medium", capabilities: { reasoning: true } },
			),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			},
		)
	);
	try {
		const hooks = await NineRouterModels({} as never);
		const config: Config = { provider: {}, small_model: "" };
		await hooks.config?.(config);
		assert.equal(config.small_model, "9router/cbcn/deepseek-v4.1-flash");
		const provider = (config.provider as Record<
			string,
			{
				models: Record<string, ReturnType<typeof toOpenCodeModel>>;
				npm: string;
				options: { baseURL: string };
			}
		>)["9router"];
		assert.equal(provider.npm, "@ai-sdk/openai-compatible");
		assert.equal(provider.options.baseURL, "http://127.0.0.1:20128/v1");
		const models = provider.models;
		assert.deepEqual(Object.keys(models), [
			"cbcn/glm-5.3",
			"cx/gpt-5.5",
			"ag/claude-sonnet-4-6",
			"ag/claude-opus-4-6-thinking",
			"ag/gpt-oss-120b-medium",
		]);
		assert.deepEqual(models["cbcn/glm-5.3"].options, { reasoningEffort: "xhigh" });
		assert.deepEqual(models["cbcn/glm-5.3"].variants, { max: { reasoningEffort: "xhigh" } });
		assert.equal(models["cx/gpt-5.5"].reasoning, true);
		assert.deepEqual(models["cx/gpt-5.5"].options, { reasoningEffort: "xhigh" });
		assert.deepEqual(models["cx/gpt-5.5"].variants, { max: { reasoningEffort: "xhigh" } });
		assert.deepEqual(models["ag/claude-sonnet-4-6"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/claude-sonnet-4-6"].variants, { max: { reasoningEffort: "max" } });
		assert.deepEqual(models["ag/claude-opus-4-6-thinking"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/claude-opus-4-6-thinking"].variants, { max: { reasoningEffort: "max" } });
		assert.deepEqual(models["ag/gpt-oss-120b-medium"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/gpt-oss-120b-medium"].variants, { max: { reasoningEffort: "max" } });
	} finally {
		restoreFetch();
	}
});

test("forces measured effort on auxiliary OpenCode turns", async () => {
	const hooks = await NineRouterModels({} as never);
	const output = { temperature: 0, topP: 1, options: { reasoningEffort: "minimal" } };
	await hooks["chat.params"]?.(
		{ model: { id: "cbcn/minimax-m3", reasoning: true }, provider: { id: "9router" } } as never,
		output,
	);
	assert.equal(output.options.reasoningEffort, "xhigh");
});

test("preserves user-supplied provider options while filling 9router defaults", async () => {
	const restoreFetch = mockFetch(async () => new Response(catalogFixture({ id: "cx/gpt-5.5", capabilities: { reasoning: true } }), { status: 200 }));
	try {
		const hooks = await NineRouterModels({} as never);
		const config: Config = {
			provider: {
				"9router": { options: { baseURL: "http://stale:1", headers: { "x-custom": "keep-me" } } },
				"other-provider": { options: { baseURL: "http://elsewhere:2" } },
			},
		};
		await hooks.config?.(config);
		const nine = (config.provider as Record<string, { options: Record<string, unknown> }>)["9router"];
		// Managed fields are overwritten; anything the user set is preserved.
		assert.equal(nine.options.baseURL, "http://127.0.0.1:20128/v1");
		assert.equal(nine.options.apiKey, "sk_9router");
		assert.deepEqual(nine.options.headers, { "x-custom": "keep-me" });
		// Unrelated providers must not be touched at all.
		assert.deepEqual(
			(config.provider as Record<string, { options: Record<string, unknown> }>)["other-provider"],
			{ options: { baseURL: "http://elsewhere:2" } },
		);
	} finally {
		restoreFetch();
	}
});

test("does not override effort for an unmeasured reasoning model", async () => {
	const hooks = await NineRouterModels({} as never);
	const output = { temperature: 0, topP: 1, options: { reasoningEffort: "minimal" } };
	await hooks["chat.params"]?.(
		{ model: { id: "ag/gemini-future", reasoning: true }, provider: { id: "9router" } } as never,
		output,
	);
	assert.equal(output.options.reasoningEffort, "minimal");
});
