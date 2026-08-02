import type { ExtensionAPI, ProviderConfig, ProviderModelConfig } from "@earendil-works/pi-coding-agent";

import {
	catalogCapabilities,
	fetchCatalog,
	resolveApiKey,
	resolveBaseUrl,
	type CatalogRecord,
} from "../src/catalog.ts";
import { highestWireEffort } from "../src/effort.ts";

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const HIDDEN_THINKING_LEVELS = {
	off: null,
	minimal: null,
	low: null,
	medium: null,
	high: null,
	xhigh: null,
} satisfies NonNullable<ProviderModelConfig["thinkingLevelMap"]>;

const DEEPSEEK_FLASH_FALLBACK: CatalogRecord = {
	id: "cbcn/deepseek-v4-flash",
	capabilities: {
		vision: true,
		reasoning: true,
		contextWindow: 1_000_000,
		maxOutput: 50_000,
	},
};

function positiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Projects one live 9Router record into Pi's provider model format.
 * @throws When a reasoning model has no measured highest effort.
 * @see ../docs/EFFORT_MATRIX.md
 */
export function toPiModel(record: CatalogRecord): ProviderModelConfig {
	const capabilities = catalogCapabilities(record);
	const reasoning = capabilities.reasoning === true;
	if (reasoning) highestWireEffort(record.id);

	return {
		id: record.id,
		name:
			typeof record.name === "string"
				? record.name
				: typeof record.display_name === "string"
					? record.display_name
					: record.id,
		reasoning,
		input: capabilities.vision === true ? ["text", "image"] : ["text"],
		cost: ZERO_COST,
		contextWindow: positiveNumber(capabilities.contextWindow, 128_000),
		maxTokens: positiveNumber(capabilities.maxOutput, 16_384),
		...(reasoning
			? {
					// Client max maps to the measured wire value; see docs/EFFORT_MATRIX.md.
					thinkingLevelMap: { ...HIDDEN_THINKING_LEVELS, max: highestWireEffort(record.id) },
					compat: { forceAdaptiveThinking: true },
				}
			: {}),
	};
}

/** Registers the canonical 9Router provider in Pi. */
export default function registerNineRouter(pi: ExtensionAPI): void {
	const provider: ProviderConfig = {
		name: "9Router",
		baseUrl: resolveBaseUrl(),
		apiKey: resolveApiKey(),
		authHeader: true,
		api: "anthropic-messages",
		models: [toPiModel(DEEPSEEK_FLASH_FALLBACK)],
		refreshModels: async ({ signal }) => (await fetchCatalog({ signal })).map(toPiModel),
	};
	pi.registerProvider("9router", provider);
}
