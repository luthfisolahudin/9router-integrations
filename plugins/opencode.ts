import type { Plugin } from "@opencode-ai/plugin";

import { catalogCapabilities, fetchCatalog, resolveApiKey, resolveBaseUrl, type CatalogRecord } from "../src/catalog.ts";
import { highestWireEffort } from "../src/effort.ts";

function toOpenCodeModel(record: CatalogRecord) {
	const capabilities = catalogCapabilities(record);
	const reasoning = capabilities.reasoning === true;
	const input: Array<"text" | "audio" | "image" | "video" | "pdf"> = ["text"];
	const output: Array<"text" | "audio" | "image" | "video" | "pdf"> = ["text"];
	if (capabilities.audioInput === true) input.push("audio");
	if (capabilities.vision === true) input.push("image");
	if (capabilities.videoInput === true) input.push("video");
	if (capabilities.pdf === true) input.push("pdf");
	if (capabilities.imageOutput === true) output.push("image");
	if (capabilities.audioOutput === true) output.push("audio");

	const effort = reasoning ? highestWireEffort(record.id) : undefined;
	return {
		name: typeof record.name === "string" ? record.name : record.id,
		attachment: input.length > 1,
		reasoning,
		...(typeof capabilities.tools === "boolean" ? { tool_call: capabilities.tools } : {}),
		...(effort
			? {
					interleaved: { field: "reasoning_content" as const },
					// 9Router currently normalizes wire max to xhigh; see docs/EFFORT_MATRIX.md.
					options: { reasoningEffort: effort },
					variants: { max: { reasoningEffort: effort } },
				}
			: {}),
		...(typeof capabilities.contextWindow === "number" && typeof capabilities.maxOutput === "number"
			? { limit: { context: capabilities.contextWindow, output: capabilities.maxOutput } }
			: {}),
		modalities: { input, output },
	};
}

/** Loads the exact active 9Router catalog into OpenCode. */
export const NineRouterModels: Plugin = async () => ({
	config: async (config) => {
		const models = Object.fromEntries((await fetchCatalog()).map((record) => [record.id, toOpenCodeModel(record)]));
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
});
