import {
	capabilityView,
	displayName,
	inputModalities,
	outputModalities,
	resolveLimit,
	type Availability,
	type ModelFacts,
	type NormalizedModel,
	type Pack,
	type RawRecord,
	type Source,
} from "@repo/contract";

import { exclusionReason } from "./availability.ts";
import type { LimitIndex } from "./modelsdev.ts";

export interface BuildOptions {
	modelsDev?: LimitIndex;
	/** Ids with a measured wire effort; drives `provenance.effort`. */
	measuredIds?: ReadonlySet<string>;
}

const DEFAULT_CONTEXT = 128_000;
const DEFAULT_MAX_OUTPUT = 16_384;

function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
	for (const value of values) {
		if (value !== undefined) return value;
	}
	return undefined;
}

interface MergedFacts {
	/** Facts the provider itself declared (including `hooks.normalize` output). */
	catalog: ModelFacts;
	/** Facts the pack supplies where the provider is silent or wrong. */
	curated: Partial<ModelFacts>;
	/** What the hosts see: catalog for limits, curated for identity and modalities. */
	effective: ModelFacts;
}

/**
 * Keeps catalog facts and curated facts apart instead of merging them on the
 * spot, because the limit ladder has to know which one it hit. Merging early is
 * how a curated value silently starts reporting itself as `catalog`.
 */
function mergeFacts(pack: Pack, record: RawRecord): MergedFacts | undefined {
	const view = capabilityView(record, pack.fields);
	const id = String(record.id);
	const curated = pack.curated?.[id] ?? {};
	const hooked = pack.hooks?.normalize?.(record);
	if (pack.hooks?.normalize !== undefined && hooked === undefined) return undefined;

	const catalog: ModelFacts = {
		input: inputModalities(view),
		output: outputModalities(view),
		reasoning: view.reasoning,
		availability: (view.availability ?? "unknown") as Availability,
		...(view.name === undefined ? {} : { name: view.name }),
		...(view.contextWindow === undefined ? {} : { contextWindow: view.contextWindow }),
		...(view.maxOutput === undefined ? {} : { maxOutput: view.maxOutput }),
		...(view.tools === undefined ? {} : { tools: view.tools }),
		...(view.thinkingFormat === undefined ? {} : { thinkingFormat: view.thinkingFormat }),
		...(view.thinkingCanDisable === undefined ? {} : { thinkingCanDisable: view.thinkingCanDisable }),
		...(view.priceBlended === undefined ? {} : { priceBlended: view.priceBlended }),
		...(hooked ?? {}),
		id,
	};

	const effective: ModelFacts = {
		id,
		name: firstDefined(curated.name, catalog.name),
		contextWindow: firstDefined(catalog.contextWindow, curated.contextWindow),
		maxOutput: firstDefined(catalog.maxOutput, curated.maxOutput),
		input: firstDefined(curated.input, catalog.input),
		output: firstDefined(curated.output, catalog.output),
		tools: firstDefined(catalog.tools, curated.tools),
		reasoning: catalog.reasoning === true || curated.reasoning === true,
		thinkingFormat: firstDefined(catalog.thinkingFormat, curated.thinkingFormat),
		thinkingCanDisable: firstDefined(catalog.thinkingCanDisable, curated.thinkingCanDisable),
		availability: firstDefined(catalog.availability, curated.availability) ?? "unknown",
		priceBlended: firstDefined(catalog.priceBlended, curated.priceBlended),
	};
	for (const key of ["name", "contextWindow", "maxOutput", "tools", "thinkingFormat", "thinkingCanDisable", "priceBlended"] as const) {
		if (effective[key] === undefined) delete effective[key];
	}

	return { catalog, curated, effective };
}

export function buildModel(pack: Pack, merged: MergedFacts, options: BuildOptions = {}): NormalizedModel {
	const { catalog, curated, effective } = merged;
	const hint = options.modelsDev?.get(effective.id);

	const context = resolveLimit({
		catalog: catalog.contextWindow,
		curated: curated.contextWindow,
		modelsDev: hint?.contextWindow,
		defaultValue: pack.defaults?.contextWindow ?? DEFAULT_CONTEXT,
	});
	const maxOutput = resolveLimit({
		catalog: catalog.maxOutput,
		curated: curated.maxOutput,
		modelsDev: hint?.maxOutput,
		defaultValue: pack.defaults?.maxOutput ?? DEFAULT_MAX_OUTPUT,
		capBy: context.value,
	});

	const model: NormalizedModel = {
		providerId: pack.id,
		id: effective.id,
		name: effective.name ?? displayName(effective.id, { brands: pack.brands, owners: pack.owners, names: pack.names }),
		contextWindow: context.value,
		maxOutput: maxOutput.value,
		input: effective.input ?? ["text"],
		output: effective.output ?? ["text"],
		reasoning: effective.reasoning === true,
		thinking: {
			...(effective.thinkingFormat === undefined ? {} : { format: effective.thinkingFormat }),
			...(effective.thinkingCanDisable === undefined ? {} : { canDisable: effective.thinkingCanDisable }),
		},
		availability: effective.availability ?? "unknown",
		provenance: {
			limits: { context: context.source, maxOutput: maxOutput.source },
			modalities: curated.input !== undefined || curated.output !== undefined ? "curated" : "catalog",
			reasoning: curated.reasoning === true ? "curated" : "catalog",
			pricing: effective.priceBlended === undefined ? "default" : "catalog",
			effort: options.measuredIds?.has(effective.id) === true ? "measured" : "default",
		},
	};
	if (effective.tools !== undefined) model.tools = effective.tools;

	const excluded = exclusionReason({ pack, modelId: model.id, availability: model.availability });
	if (excluded !== undefined) model.excluded = { reason: excluded };

	return pack.hooks?.decorate?.(model) ?? model;
}

function pinnedModel(pack: Pack, id: string): MergedFacts {
	const facts: ModelFacts = { id, input: ["text"], output: ["text"], reasoning: false, availability: "unknown" };
	return { catalog: facts, curated: {}, effective: facts };
}

/**
 * Builds the full list: discovered records, then any pinned fallback member the
 * catalog did not return. Excluded records stay in the list with a reason so
 * reporting can explain every disappearance.
 */
export function buildModels(pack: Pack, records: readonly RawRecord[], options: BuildOptions = {}): NormalizedModel[] {
	const models: NormalizedModel[] = [];
	const seen = new Set<string>();

	for (const record of records) {
		const merged = mergeFacts(pack, record);
		if (merged === undefined) continue;
		seen.add(merged.effective.id);
		models.push(buildModel(pack, merged, options));
	}

	for (const pinned of pack.fallback ?? []) {
		if (seen.has(pinned.id)) continue;
		const model = buildModel(pack, pinnedModel(pack, pinned.id), options);
		// A pinned fallback exists so the provider is never empty offline.
		delete model.excluded;
		models.push(model);
	}

	return models.sort((a, b) => a.id.localeCompare(b.id));
}

export type { Source };
