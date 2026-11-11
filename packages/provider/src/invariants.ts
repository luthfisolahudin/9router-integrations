/**
 * Curated ground truth for the live 9Router catalog.
 *
 * The router derives modality from hand-written capability tables and name
 * heuristics, so a table gap silently degrades a model: `cbcn/deepseek-v4.1-flash`
 * once shipped `vision: false` because it fell through to a generic
 * `*deepseek-v4*` pattern, and every downstream projection dropped image input
 * without throwing. These assertions are the independent source of truth.
 *
 * Rules:
 * - assert only externally verifiable facts (vendor docs, model cards), never
 *   whatever the router reports today;
 * - a model that leaves the catalog is reported as absent, not as a failure;
 * - `task check:catalog` compares these against the projected model.
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
		id: "cbcn/kimi-k3",
		expected: { vision: true, reasoning: true, videoInput: true },
		note: "Kimi K3 is a multimodal reasoning model with image and video input.",
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
