// Minimal ambient shims so the typecheck runs without @opencode-ai/plugin and
// @earendil-works/pi-coding-agent installed. The repo has no runtime
// dependencies; these mirror the only members the code touches.

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
			// Mirror @earendil-works/pi-ai's ThinkingFormat union (types.d.ts) so
			// this shim does not silently narrow real values the adapter accepts.
			thinkingFormat?:
				| "openai"
				| "openrouter"
				| "together"
				| "baseten"
				| "deepseek"
				| "zai"
				| "qwen"
				| "chat-template"
				| "qwen-chat-template"
				| "string-thinking"
				| "ant-ling";
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

	// The real Plugin type receives plugin input (e.g. project context); tests
	// pass `{} as never`, so the shim must accept exactly one argument.
	export type Plugin = (input: never) => Promise<{
		config: (config: Config) => Promise<void>;
		"chat.params": (
			input: { model: ChatModel; provider: { id: string } },
			output: { options: Record<string, unknown> },
		) => Promise<void>;
	}>;
}
