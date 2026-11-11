import { PACK_SCHEMA_VERSION, definePack } from "@luthfisolahudin/ai-provider-integrations-template-contract";

/**
 * Tier B: the provider describes modalities, availability, and price, but never
 * sends limits. Limits come from the vendor's public model page (curated) or
 * from models.dev, and the rest stays a recorded default.
 */
export const tierBPack = definePack({
	schemaVersion: PACK_SCHEMA_VERSION,
	id: "example-tier-b",
	name: "Example Tier B",
	baseUrl: "https://api.example-tier-b.test/v1",
	discovery: { path: "/models" },
	fields: {
		vision: ["supports_vision"],
		reasoning: ["supports_reasoning"],
		inputModalities: ["input_modalities"],
		availability: ["status"],
		displayName: ["provider"],
	},
	filter: { dropOffline: true, nonChatPattern: "(^|[-_/])(embed|image)([-_/]|$)" },
	fallback: [{ id: "tier-b-chat" }],
	defaults: { contextWindow: 128_000, maxOutput: 32_768 },
	curated: {
		"tier-b-chat": { contextWindow: 1_000_000, maxOutput: 384_000 },
	},
});
