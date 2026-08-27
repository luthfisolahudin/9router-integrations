import type { ExtensionAPI, ProviderConfig, ProviderModelConfig } from "@earendil-works/pi-coding-agent";

import {
	catalogCapabilities,
	displayName,
	fetchCatalog,
	resolveApiBaseUrl,
	resolveApiKey,
	type CatalogRecord,
} from "../src/catalog.ts";
import { measuredWireEffort } from "../src/effort.ts";

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const HIDDEN_THINKING_LEVELS = {
	off: null,
	minimal: null,
	low: null,
	medium: null,
	high: null,
	xhigh: null,
} satisfies NonNullable<ProviderModelConfig["thinkingLevelMap"]>;

const STARTUP_FALLBACK: CatalogRecord[] = [
	{
		id: "cbcn/deepseek-v4-flash",
		capabilities: {
			vision: true,
			reasoning: true,
			contextWindow: 1_000_000,
			maxOutput: 50_000,
		},
	},
	{
		id: "cx/gpt-5.6-terra",
		capabilities: {
			vision: true,
			reasoning: true,
			contextWindow: 272_000,
			maxOutput: 128_000,
		},
	},
];

function positiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Projects one live 9Router record into Pi's provider model format.
 * @see ../docs/EFFORT_MATRIX.md
 */
export function toPiModel(record: CatalogRecord): ProviderModelConfig {
	const capabilities = catalogCapabilities(record);
	const reasoning = capabilities.reasoning === true;
	const effort = reasoning ? measuredWireEffort(record.id) : undefined;

	return {
		id: record.id,
		name: displayName(record.id),
		reasoning,
		input: capabilities.vision === true ? ["text", "image"] : ["text"],
		cost: ZERO_COST,
		contextWindow: positiveNumber(capabilities.contextWindow, 128_000),
		maxTokens: positiveNumber(capabilities.maxOutput, 16_384),
		...(reasoning && effort !== undefined
			? {
					// Client max maps to the measured wire value; see docs/EFFORT_MATRIX.md.
					thinkingLevelMap: { ...HIDDEN_THINKING_LEVELS, max: effort },
					compat: {
						requiresReasoningContentOnAssistantMessages: true,
						supportsReasoningEffort: true,
						thinkingFormat: "openai",
					},
				}
			: {}),
	};
}

/** Registers the canonical 9Router provider in Pi. */
export default function registerNineRouter(pi: ExtensionAPI): void {
	let models = STARTUP_FALLBACK.map(toPiModel);
	const provider: ProviderConfig = {
		name: "9Router",
		baseUrl: resolveApiBaseUrl(),
		apiKey: resolveApiKey(),
		authHeader: true,
		api: "openai-completions",
		models,
		refreshModels: async ({ allowNetwork, signal }) => {
			if (!allowNetwork || signal.aborted) return models;
			models = (await fetchCatalog({ signal })).map(toPiModel);
			return models;
		},
	};
	pi.registerProvider("9router", provider);
}
