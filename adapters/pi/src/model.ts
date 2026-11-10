import { effortMenu, mapThinkingFormat, type NormalizedModel } from "@luthfisolahudin/ai-provider-integrations-template-contract";

/** Pi's chat-model shape, kept structural so projection tests need no host SDK. */
export interface PiModel {
	type: "chat";
	id: string;
	name: string;
	provider: string;
	api: "openai-completions";
	baseUrl: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	thinkingLevelMap?: Record<string, string | null>;
	compat?: Record<string, unknown>;
}

export const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const;

export interface HostOptions {
	providerId: string;
	baseUrl: string;
	api?: "openai-completions";
	/** Provider-level compatibility defaults, overridable per model. */
	compat?: Record<string, unknown>;
}

export interface ProjectOptions extends HostOptions {
	/** Measured wire effort for this model, if any. See the provider's `effort.ts`. */
	wireEffort?: string;
}

/**
 * Projects one normalised model into Pi's shape, or `undefined` when the model
 * should not be registered (excluded by the pack, e.g. offline or non-chat).
 *
 * Thinking policy:
 * - a declared format Pi can reproduce gets `compat.thinkingFormat`;
 * - an effort menu exists only when a probe measured a wire value;
 * - an unmapped format gets no menu: the model still reports thinking content,
 *   but the integration does not claim it can shape it.
 */
export function toPiModel(model: NormalizedModel, options: ProjectOptions): PiModel | undefined {
	if (model.excluded !== undefined) return undefined;

	const projected: PiModel = {
		type: "chat",
		id: model.id,
		name: model.name,
		provider: options.providerId,
		api: options.api ?? "openai-completions",
		baseUrl: options.baseUrl,
		reasoning: model.reasoning,
		input: model.input.filter((m): m is "text" | "image" => m === "text" || m === "image"),
		cost: { ...ZERO_COST },
		contextWindow: model.contextWindow,
		maxTokens: model.maxOutput,
	};

	if (!model.reasoning) return projected;

	const mapping = mapThinkingFormat(model.thinking.format);
	const menu =
		options.wireEffort === undefined
			? undefined
			: effortMenu({ wireEffort: options.wireEffort, canDisable: model.thinking.canDisable });
	const compat: Record<string, unknown> = { ...options.compat };

	if (mapping.pi !== undefined) {
		compat.thinkingFormat = mapping.pi;
		if (menu !== undefined) {
			compat.supportsReasoningEffort = true;
			projected.thinkingLevelMap = menu;
		}
	}
	if (Object.keys(compat).length > 0) projected.compat = compat;
	return projected;
}

/** Builds the model list a host registers, dropping exclusions. */
export function toPiModels(
	models: readonly NormalizedModel[],
	effort: Readonly<Record<string, string>>,
	options: HostOptions,
): PiModel[] {
	const projected: PiModel[] = [];
	for (const model of models) {
		const wireEffort = effort[model.id];
		const entry = toPiModel(model, {
			...options,
			...(wireEffort === undefined ? {} : { wireEffort }),
		});
		if (entry !== undefined) projected.push(entry);
	}
	return projected;
}
