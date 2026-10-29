// Minimal ambient shim so the typecheck runs without @opencode-ai/plugin installed.
// The repo has no runtime dependencies; this mirrors the only members the code touches.

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
