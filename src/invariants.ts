import { catalogCapabilities, type CatalogRecord } from "./catalog.ts";

/**
 * Curated, ground-truth capability assertions for the live 9Router catalog.
 *
 * The router derives modality from its own hand-written capability tables and
 * name heuristics. A table gap silently degrades a model — `cbcn/deepseek-v4.1-flash`
 * shipped with `vision: false` because it fell through to the generic
 * `*deepseek-v4*` pattern, so every downstream projection dropped image input.
 * `pnpm check:catalog` trusts the router blindly, so a regression like that
 * passes unnoticed. These invariants are the independent source of truth that
 * catches it.
 *
 * Rules:
 * - An entry only asserts while the model is present; a deliberately removed
 *   model is not a failure (it is reported as absent, so curation stays visible).
 * - `expected` is compared with strict equality against `record.capabilities`.
 * - Keep entries to facts that are externally verifiable (vendor docs, model
 *   cards), not whatever the router currently reports.
 */
export interface CapabilityInvariant {
	readonly id: string;
	readonly expected: Readonly<Record<string, boolean | number | string>>;
	readonly note: string;
}

export const CAPABILITY_INVARIANTS: readonly CapabilityInvariant[] = [
	{
		id: "cbcn/deepseek-v4.1-flash",
		expected: { vision: true, reasoning: true, tools: true },
		note: "V4.1-Flash is natively multimodal (DeepSeek-ViT vision encoder in the base model); text+image input, 1M context, 384K output.",
	},
	{
		id: "cbcn/deepseek-v4-pro",
		expected: { vision: true, reasoning: true },
		note: "V4-Pro accepts image input per the CodeBuddy CN gateway capability table.",
	},
	{
		id: "cbcn/deepseek-v4-flash",
		expected: { vision: true, reasoning: true },
		note: "V4-Flash accepts image input (its vision variant was folded into V4.1-Flash).",
	},
	{
		id: "cbcn/kimi-k3",
		expected: { vision: true, reasoning: true, videoInput: true },
		note: "Kimi K3 is a multimodal reasoning model with image and video input.",
	},
	{
		id: "cbcn/kimi-k3-1",
		expected: { vision: true, reasoning: true },
		note: "Kimi K3-1 is the image-capable reasoning variant.",
	},
	{
		id: "cbcn/minimax-m3",
		expected: { vision: true, reasoning: true },
		note: "MiniMax M3 is a multimodal reasoning model.",
	},
	{
		id: "cbcn/glm-5.3",
		expected: { vision: true, reasoning: true },
		note: "GLM-5.3 is vision-capable.",
	},
	{
		id: "cbcn/glm-5.3-flash",
		expected: { vision: true, reasoning: true },
		note: "GLM-5.3-Flash is vision-capable.",
	},
	{
		id: "ag/gemini-3.8-flash-high",
		expected: { vision: true, audioInput: true, videoInput: true, reasoning: true },
		note: "Gemini 3.8 Flash High accepts image, audio, and video input.",
	},
	{
		id: "ag/claude-opus-4-6-thinking",
		expected: { vision: true, reasoning: true },
		note: "Claude Opus 4.6 Thinking accepts image input.",
	},
	{
		id: "ag/claude-sonnet-4-6",
		expected: { vision: true, reasoning: true },
		note: "Claude Sonnet 4.6 accepts image input.",
	},
	{
		id: "cx/gpt-5.6-terra",
		expected: { vision: true, reasoning: true },
		note: "GPT-5.6 Terra is the tt-pinned reasoning vision fallback.",
	},
	{
		id: "ag/gpt-oss-120b-medium",
		expected: { vision: false, reasoning: true },
		note: "gpt-oss is text-only; guards against a pattern over-declaring vision.",
	},
];

export interface CapabilityInvariantResult {
	/** Curated models present in the catalog with a contradicting capability. */
	readonly violations: readonly string[];
	/** Curated models absent from the catalog (informational; may be intentional). */
	readonly absent: readonly string[];
}

/** Verifies live records against {@link CAPABILITY_INVARIANTS}. */
export function checkCapabilityInvariants(records: readonly CatalogRecord[]): CapabilityInvariantResult {
	const byId = new Map(records.map((record) => [record.id, record]));
	const violations: string[] = [];
	const absent: string[] = [];

	for (const invariant of CAPABILITY_INVARIANTS) {
		const record = byId.get(invariant.id);
		if (record === undefined) {
			absent.push(invariant.id);
			continue;
		}
		const capabilities = catalogCapabilities(record);
		for (const [key, expected] of Object.entries(invariant.expected)) {
			if (capabilities[key] !== expected) {
				violations.push(
					`${invariant.id}: capabilities.${key} is ${JSON.stringify(capabilities[key])}, expected ${JSON.stringify(expected)} (${invariant.note})`,
				);
			}
		}
	}

	return { violations, absent };
}
