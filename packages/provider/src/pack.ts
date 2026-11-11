import { PACK_SCHEMA_VERSION, definePack } from "@luthfisolahudin/9router-integrations-contract";

import { curated } from "./curated.ts";
import { FALLBACK } from "./fallback.ts";

/**
 * 9Router's catalog is self-describing (`capabilities` with limits, modalities, a
 * thinking hint and `thinkingCanDisable`), and it is the one provider here that
 * forwards to other providers, so its ids are `owner/slug`.
 *
 * Everything vendor-specific lives in this file: the router root, the default key,
 * the ids that must never reach a picker, and the label maps. Nothing generic.
 */
export const nineRouterPack = definePack({
	schemaVersion: PACK_SCHEMA_VERSION,
	id: "9router",
	name: "9Router",
	baseUrl: "http://127.0.0.1:20128/v1",
	api: "openai-completions",
	auth: { kind: "bearer", apiKeyEnv: "NINE_ROUTER_API_KEY", apiKey: "sk_9router" },
	discovery: { path: "/models", timeoutMs: 5_000 },
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
	},
	filter: {
		// Unused routes: a second Kimi K3 spelling, two retired DeepSeek variants,
		// and Codex's internal review route.
		excludeIds: ["cbcn/kimi-k3-1", "cbcn/deepseek-v4-pro", "cbcn/deepseek-v4-flash", "cx/codex-auto-review"],
		nonChatPattern: "(^|[-_/])(embed|embedding|rerank)([-_/]|$)",
		dropOffline: true,
	},
	// The router translates effort itself and renamed its formats. The matrix records
	// that `reasoning_effort` is honoured on these routes, so the equivalence is
	// measured, not guessed.
	thinkingFormatOverrides: { "gemini-budget": "openai", "claude-adaptive": "openai" },
	fallback: FALLBACK.map((id) => ({ id })),
	curated,
	defaults: { contextWindow: 128_000, maxOutput: 16_384 },
	brands: {
		deepseek: "DeepSeek",
		gemini: "Gemini",
		glm: "GLM",
		gpt: "GPT",
		kimi: "Kimi",
		minimax: "MiniMax",
		oss: "OSS",
	},
	owners: {
		ag: "Antigravity",
		cbcn: "CodeBuddy CN",
		cx: "OpenAI Codex",
	},
	names: {
		"ag/claude-opus-4-6-thinking": "Claude Opus 4.6",
		"ag/claude-sonnet-4-6": "Claude Sonnet 4.6",
		"ag/gemini-3.8-flash-high": "Gemini 3.8 Flash",
		"ag/gpt-oss-120b-medium": "GPT OSS 120B",
	},
	hosts: {
		pi: { smallModel: "cbcn/deepseek-v4.1-flash" },
		opencode: { package: "@opencode/ai/providers/openai-compatible", smallModel: "cbcn/deepseek-v4.1-flash" },
	},
});
