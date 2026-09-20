import type { CatalogRecord } from "./catalog.ts";

/**
 * Minimal catalog served before the first successful discovery: the DeepSeek
 * V4.1 Flash default plus the tt-pinned GPT 5.6 Terra fallback. Both clients
 * start usable offline; a successful catalog refresh replaces this membership
 * with the exact live one. Capabilities mirror docs/EFFORT_MATRIX.md evidence.
 */
export const STARTUP_FALLBACK: readonly CatalogRecord[] = [
	{
		id: "cbcn/deepseek-v4.1-flash",
		capabilities: {
			vision: true,
			reasoning: true,
			// Mirrors the curated invariant: offline OpenCode must keep tool calls
			// on its pinned small model, not just when the router is up.
			tools: true,
			contextWindow: 1_000_000,
			maxOutput: 384_000,
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
