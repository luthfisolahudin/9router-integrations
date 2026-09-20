import type { Plugin } from "@opencode-ai/plugin";

import { capabilityView } from "../src/capabilities.ts";
import { displayName, fetchCatalog, resolveApiKey, resolveBaseUrl, type CatalogRecord } from "../src/catalog.ts";
import { measuredWireEffort } from "../src/effort.ts";
import { STARTUP_FALLBACK } from "../src/fallback.ts";

export function toOpenCodeModel(record: CatalogRecord) {
	const capabilities = capabilityView(record);
	const input: Array<"text" | "audio" | "image" | "video" | "pdf"> = ["text"];
	const output: Array<"text" | "audio" | "image" | "video" | "pdf"> = ["text"];
	if (capabilities.audioInput) input.push("audio");
	if (capabilities.vision) input.push("image");
	if (capabilities.videoInput) input.push("video");
	if (capabilities.pdf) input.push("pdf");
	if (capabilities.imageOutput) output.push("image");
	if (capabilities.audioOutput) output.push("audio");

	const effort = capabilities.effort;
	return {
		name: displayName(record.id),
		attachment: input.length > 1,
		reasoning: capabilities.reasoning,
		...(capabilities.tools !== undefined ? { tool_call: capabilities.tools } : {}),
		...(effort
			? {
					interleaved: { field: "reasoning_content" as const },
					// Client max maps to the measured wire value; see docs/EFFORT_MATRIX.md.
					options: { reasoningEffort: effort },
					variants: { max: { reasoningEffort: effort } },
				}
			: {}),
		...(capabilities.contextWindow !== undefined && capabilities.maxOutput !== undefined
			? { limit: { context: capabilities.contextWindow, output: capabilities.maxOutput } }
			: {}),
		modalities: { input, output },
	};
}

/** Loads the exact active 9Router catalog into OpenCode. */
export const NineRouterModels: Plugin = async () => ({
	config: async (config) => {
		// Offline parity with Pi: start on the pinned fallback records, then swap
		// in the exact live membership once discovery succeeds.
		let records: CatalogRecord[];
		try {
			records = await fetchCatalog();
		} catch (error) {
			records = STARTUP_FALLBACK as CatalogRecord[];
			console.error(
				`9Router model discovery failed (${error instanceof Error ? error.message : String(error)}); starting with ${records.length} pinned fallback models until a refresh succeeds`,
			);
		}
		const models = Object.fromEntries(records.map((record) => [record.id, toOpenCodeModel(record)]));
		// Title turns bypass chat.params; pin them to a measured model. See docs/EFFORT_MATRIX.md.
		config.small_model = "9router/cbcn/deepseek-v4.1-flash";
		config.provider ??= {};
		const existing = config.provider["9router"] ?? {};
		config.provider["9router"] = {
			...existing,
			npm: "@ai-sdk/openai-compatible",
			name: "9Router",
			options: {
				...existing.options,
				baseURL: `${resolveBaseUrl()}/v1`,
				apiKey: resolveApiKey(),
			},
			models,
		};
	},
	"chat.params": async ({ model, provider }, output) => {
		if (provider.id !== "9router" || !model.reasoning) return;
		// OpenCode auxiliary turns can override variants; see docs/EFFORT_MATRIX.md.
		const effort = measuredWireEffort(model.id);
		if (effort !== undefined) output.options.reasoningEffort = effort;
	},
});
