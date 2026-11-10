import type { ModelFacts } from "@luthfisolahudin/ai-provider-integrations-template-contract";

/**
 * Facts the catalog cannot express, keyed by model id.
 *
 * Rules:
 * - only add an entry when the provider is silent or demonstrably wrong;
 * - cite where the fact comes from in `docs/EVIDENCE.md`;
 * - never guess a capability the provider does not declare. Unknown is a valid
 *   answer and it shows up as `default` provenance in `docs/PROVIDERS.md`.
 */
export const curated: Record<string, Partial<ModelFacts>> = {
	// Example: the provider ships no display name for this id.
	"example-reason-kimi": { name: "Example Reason Kimi" },
};
