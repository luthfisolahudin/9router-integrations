import { PACK_SCHEMA_VERSION, definePack } from "@repo/contract";

/**
 * Tier C: the catalog is a list of ids and nothing else. Every capability is
 * either curated from the vendor's docs or left at a recorded default. This is
 * the shape that makes "unknown stays unknown" visible instead of plausible.
 */
export const tierCPack = definePack({
	schemaVersion: PACK_SCHEMA_VERSION,
	id: "example-tier-c",
	name: "Example Tier C",
	baseUrl: "https://api.example-tier-c.test/v1",
	discovery: { path: "/models" },
	// The catalog declares nothing, so there is nothing to alias.
	fields: {},
	filter: { nonChatPattern: "(^|[-_/])(embed|embedding)([-_/]|$)" },
	fallback: [{ id: "tier-c-chat" }],
	defaults: { contextWindow: 128_000, maxOutput: 16_384 },
	curated: {
		"tier-c-chat": { contextWindow: 262_144, maxOutput: 65_536, reasoning: true, input: ["text", "image"] },
	},
});
