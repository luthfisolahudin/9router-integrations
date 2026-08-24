// Minimal ambient shim so the typecheck runs without @types/node. The repo has
// no runtime dependencies; these are the only Node globals the code touches.
declare const process: {
	env: Record<string, string | undefined>;
};

// Keep typechecking portable without coupling the repo to local tool paths.
declare module "@earendil-works/pi-coding-agent" {
	export interface ProviderModelConfig {
		id: string;
		name: string;
		reasoning: boolean;
		input: Array<"text" | "image">;
		cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
		contextWindow: number;
		maxTokens: number;
		thinkingLevelMap?: Record<string, string | null>;
		compat?: {
			requiresReasoningContentOnAssistantMessages?: boolean;
			supportsReasoningEffort?: boolean;
			thinkingFormat?: "openai";
		};
	}

	export interface ProviderConfig {
		name: string;
		baseUrl: string;
		apiKey: string;
		authHeader: boolean;
		api: "openai-completions";
		models: ProviderModelConfig[];
		refreshModels?: (options: { allowNetwork: boolean; signal: AbortSignal }) => Promise<ProviderModelConfig[]>;
	}

	export interface ExtensionAPI {
		registerProvider(name: string, provider: ProviderConfig): void;
	}
}

declare module "@opencode-ai/plugin" {
	interface ProviderOptions {
		options?: Record<string, unknown>;
		[key: string]: unknown;
	}

	interface Config {
		small_model?: string;
		provider?: Record<string, ProviderOptions>;
	}

	interface ChatModel {
		id: string;
		reasoning?: boolean;
	}

	export type Plugin = () => Promise<{
		config: (config: Config) => Promise<void>;
		"chat.params": (
			input: { model: ChatModel; provider: { id: string } },
			output: { options: Record<string, unknown> },
		) => Promise<void>;
	}>;
}
