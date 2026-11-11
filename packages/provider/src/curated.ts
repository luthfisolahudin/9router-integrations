import type { ModelFacts } from "@luthfisolahudin/9router-integrations-contract";

/**
 * Facts the router cannot be trusted to report.
 *
 * Only the two pinned fallback models need an entry: their facts have to survive
 * an offline start, when there is no catalog to read them from. Live catalog facts
 * win over these, and `docs/EFFORT_MATRIX.md` records the evidence for each.
 */
export const curated: Record<string, Partial<ModelFacts>> = {
	"cbcn/deepseek-v4.1-flash": {
		input: ["text", "image"],
		reasoning: true,
		tools: true,
		contextWindow: 1_000_000,
		maxOutput: 384_000,
	},
	"cx/gpt-5.6-terra": {
		input: ["text", "image"],
		reasoning: true,
		contextWindow: 272_000,
		maxOutput: 128_000,
	},
};
