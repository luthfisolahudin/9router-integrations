import { PACK_SCHEMA_VERSION, definePack } from "@luthfisolahudin/ai-provider-integrations-template-contract";

import { curated } from "./curated.ts";
import { FALLBACK } from "./fallback.ts";

/**
 * The one file that describes this provider.
 *
 * `fields` says where the provider puts each fact. Everything the catalog
 * cannot express belongs in `curated.ts`; everything that must be measured
 * belongs in `effort.ts`; everything that must never regress belongs in
 * `invariants.ts`. Nothing vendor-specific belongs in `packages/contract` or
 * `packages/catalog`.
 */
export const examplePack = definePack({
	schemaVersion: PACK_SCHEMA_VERSION,
	id: "example",
	name: "Example",
	baseUrl: "https://api.example.test/v1",
	api: "openai-completions",
	auth: { kind: "bearer", apiKeyEnv: "EXAMPLE_API_KEY" },
	discovery: {
		path: "/models",
		timeoutMs: 5_000,
		etag: true,
		userAgent: "ai-provider-integrations-template/0.1",
	},
	fields: {
		contextWindow: ["capabilities.contextWindow", "context_length"],
		maxOutput: ["capabilities.maxOutput", "max_completion_tokens"],
		vision: ["capabilities.vision"],
		pdf: ["capabilities.pdf"],
		audioInput: ["capabilities.audioInput"],
		videoInput: ["capabilities.videoInput"],
		imageOutput: ["capabilities.imageOutput"],
		audioOutput: ["capabilities.audioOutput"],
		tools: ["capabilities.tools"],
		reasoning: ["capabilities.reasoning"],
		thinkingFormat: ["capabilities.thinkingFormat"],
		thinkingCanDisable: ["capabilities.thinkingCanDisable"],
		displayName: ["name"],
	},
	filter: {
		excludeIds: [],
		// Embedding endpoints share the same `/models` list but cannot chat.
		nonChatPattern: "(^|[-_/])(embed|embedding|rerank)([-_/]|$)",
		dropOffline: true,
	},
	fallback: FALLBACK.map((id) => ({ id })),
	defaults: { contextWindow: 128_000, maxOutput: 16_384 },
	curated,
	brands: { example: "Example" },
	hosts: {
		opencode: { package: "@opencode/ai/providers/openai-compatible" },
	},
});
