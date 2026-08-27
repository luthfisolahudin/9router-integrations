import assert from "node:assert/strict";
import test from "node:test";

import { NineRouterModels, toOpenCodeModel } from "../plugins/opencode.ts";

test("keeps an unmeasured reasoning model visible without forcing effort", () => {
	const model = toOpenCodeModel({ id: "ag/future-reasoning-model", capabilities: { reasoning: true } });
	assert.equal(model.reasoning, true);
	assert.equal("variants" in model, false);
	assert.equal("options" in model, false);
});

test("projects exactly the live records with one max variant", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () =>
		new Response(
			JSON.stringify({
				data: [
					{ id: "cbcn/glm-5.2", capabilities: { reasoning: true } },
					{ id: "ag/gemini-3.7-flash-high", capabilities: { reasoning: true } },
					{ id: "ag/gemini-pro-agent", capabilities: { reasoning: false, contextWindow: 1_048_576, maxOutput: 64_000 } },
					{ id: "ag/claude-sonnet-4-6", capabilities: { reasoning: true } },
					{ id: "ag/claude-opus-4-6-thinking", capabilities: { reasoning: true } },
					{ id: "ag/gpt-oss-120b-medium", capabilities: { reasoning: true } },
				],
			}),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			},
		);
	try {
		const hooks = await NineRouterModels({} as never);
		const config = { provider: {}, small_model: "" };
		await hooks.config?.(config as never);
		assert.equal(config.small_model, "9router/cbcn/deepseek-v4-flash");
		const provider = (config.provider as Record<
			string,
			{ models: Record<string, { variants: unknown; options: unknown }>; npm: string; options: { baseURL: string } }
		>)["9router"];
		assert.equal(provider.npm, "@ai-sdk/openai-compatible");
		assert.equal(provider.options.baseURL, "http://127.0.0.1:20128/v1");
		const models = provider.models;
		assert.deepEqual(Object.keys(models), [
			"cbcn/glm-5.2",
			"ag/gemini-3.7-flash-high",
			"ag/gemini-pro-agent",
			"ag/claude-sonnet-4-6",
			"ag/claude-opus-4-6-thinking",
			"ag/gpt-oss-120b-medium",
		]);
		assert.deepEqual(models["cbcn/glm-5.2"].options, { reasoningEffort: "xhigh" });
		assert.deepEqual(models["cbcn/glm-5.2"].variants, { max: { reasoningEffort: "xhigh" } });
		assert.equal(models["ag/gemini-3.7-flash-high"].reasoning, true);
		assert.deepEqual(models["ag/gemini-3.7-flash-high"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/gemini-3.7-flash-high"].variants, { max: { reasoningEffort: "max" } });
		assert.equal(models["ag/gemini-pro-agent"].reasoning, false);
		assert.equal("options" in models["ag/gemini-pro-agent"], false);
		assert.deepEqual(models["ag/gemini-pro-agent"].limit, { context: 1_048_576, output: 64_000 });
		assert.deepEqual(models["ag/claude-sonnet-4-6"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/claude-opus-4-6-thinking"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/claude-opus-4-6-thinking"].variants, { max: { reasoningEffort: "max" } });
		assert.deepEqual(models["ag/gpt-oss-120b-medium"].options, { reasoningEffort: "max" });
		assert.deepEqual(models["ag/gpt-oss-120b-medium"].variants, { max: { reasoningEffort: "max" } });
	} finally {
		globalThis.fetch = originalFetch;
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

test("does not override effort for an unmeasured reasoning model", async () => {
	const hooks = await NineRouterModels({} as never);
	const output = { temperature: 0, topP: 1, options: { reasoningEffort: "minimal" } };
	await hooks["chat.params"]?.(
		{ model: { id: "ag/gemini-future", reasoning: true }, provider: { id: "9router" } } as never,
		output,
	);
	assert.equal(output.options.reasoningEffort, "minimal");
});
