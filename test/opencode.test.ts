import assert from "node:assert/strict";
import test from "node:test";

import { NineRouterModels } from "../plugins/opencode.ts";

test("projects exactly the live records with one max variant", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () =>
		new Response(JSON.stringify({ data: [{ id: "cbcn/glm-5.2", capabilities: { reasoning: true } }] }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	try {
		const hooks = await NineRouterModels({} as never);
		const config = { provider: {} };
		await hooks.config?.(config as never);
		const models = (config.provider as Record<string, { models: Record<string, { variants: unknown; options: unknown }> }>)[
			"9router"
		].models;
		assert.deepEqual(Object.keys(models), ["cbcn/glm-5.2"]);
		assert.deepEqual(models["cbcn/glm-5.2"].options, { reasoningEffort: "xhigh" });
		assert.deepEqual(models["cbcn/glm-5.2"].variants, { max: { reasoningEffort: "xhigh" } });
	} finally {
		globalThis.fetch = originalFetch;
	}
});
