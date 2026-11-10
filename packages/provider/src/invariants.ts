import type { ModelFacts } from "@repo/contract";

export interface CapabilityInvariant {
	readonly id: string;
	/**
	 * Keys are either `ModelFacts` fields or the modality shorthands below.
	 * Kept loose on purpose: every entry asserts only the facts it curates.
	 */
	readonly expected: Readonly<Record<string, boolean | number | string>>;
	readonly note: string;
}

/**
 * Curated ground truth, independent of the provider's own claims.
 *
 * A provider that silently drops `vision` does not throw: both host projections
 * just stop offering image input. These assertions turn that class of regression
 * into a failing `task check:catalog`.
 *
 * Assert only externally verifiable facts (vendor docs, model cards), never
 * whatever the catalog happens to report today.
 */
export const CAPABILITY_INVARIANTS: readonly CapabilityInvariant[] = [
	{
		id: "example-chat-1",
		expected: { vision: true, reasoning: true, tools: true, contextWindow: 1_000_000 },
		note: "1M context, image input, tool calls; the vendor's own model page lists all three.",
	},
	{
		id: "example-reason-kimi",
		expected: { vision: true, reasoning: true, videoInput: false },
		note: "Image input only; video is not accepted by this route.",
	},
];

export type { ModelFacts };
