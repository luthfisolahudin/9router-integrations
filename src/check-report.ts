import { catalogCapabilities, KNOWN_MODEL_NAMES, type CatalogRecord } from "./catalog.ts";
import { measuredWireEffort, MEASURED_WIRE_EFFORT } from "./effort.ts";
import { checkCapabilityInvariants } from "./invariants.ts";
import { toOpenCodeModel } from "../plugins/opencode.ts";
import { toPiModel } from "../extensions/pi.ts";

/** All analysis outcomes for one live catalog fetch, in report order. */
export interface CatalogCheckReport {
	/** Catalog records that crash a client projection, with client and reason. */
	readonly projectionFailures: readonly string[];
	/** Curated capability facts the live catalog contradicts. */
	readonly capabilityViolations: readonly string[];
	/** Measured efforts for models the router no longer serves. */
	readonly staleEffortEntries: readonly string[];
	/** Reasoning models with no measured wire-effort entry. */
	readonly unmeasuredReasoningModels: readonly string[];
	/** Curated invariants whose model is absent from the catalog (informational). */
	readonly absentInvariants: readonly string[];
	/** Curated display names for models the router no longer serves (informational). */
	readonly staleDisplayNameEntries: readonly string[];
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Pure analysis of a fetched catalog: projects every record through both
 * clients, verifies curated capability invariants, and reconciles the
 * measured-effort table against live membership. No I/O and no process
 * exit decisions, so the CLI script and tests share one implementation.
 */
export function buildCatalogReport(records: readonly CatalogRecord[]): CatalogCheckReport {
	const projectionFailures: string[] = [];
	const unmeasuredReasoningModels: string[] = [];
	const { violations: capabilityViolations, absent: absentInvariants } = checkCapabilityInvariants(records);

	for (const record of records) {
		try {
			toOpenCodeModel(record);
		} catch (error) {
			projectionFailures.push(`OpenCode ${record.id}: ${formatError(error)}`);
		}
		try {
			toPiModel(record);
		} catch (error) {
			projectionFailures.push(`Pi ${record.id}: ${formatError(error)}`);
		}

		if (catalogCapabilities(record).reasoning === true && measuredWireEffort(record.id) === undefined) {
			unmeasuredReasoningModels.push(record.id);
		}
	}

	// A measured effort for a model the router no longer serves is stale evidence:
	// it silently survives catalog changes and implies coverage that no longer exists.
	const liveIds = new Set(records.map((record) => record.id));
	const staleEffortEntries = Object.keys(MEASURED_WIRE_EFFORT).filter((modelId) => !liveIds.has(modelId));
	// Same drift risk for curated display names: an entry for a retired model
	// keeps rendering a picker label nothing will ever use.
	const staleDisplayNameEntries = Object.keys(KNOWN_MODEL_NAMES).filter((modelId) => !liveIds.has(modelId));

	return {
		projectionFailures,
		capabilityViolations,
		staleEffortEntries,
		unmeasuredReasoningModels,
		absentInvariants,
		staleDisplayNameEntries,
	};
}

/**
 * Decides whether a check run fails after the CLI's leniency flags. Pure so
 * the flag semantics (stale/unmeasured tolerances) stay testable without
 * spawning the script.
 */
export function isFatalCheck(
	report: Pick<CatalogCheckReport, "projectionFailures" | "capabilityViolations" | "staleEffortEntries" | "unmeasuredReasoningModels">,
	options: { allowStale: boolean; allowUnmeasured: boolean },
): boolean {
	return (
		report.projectionFailures.length > 0 ||
		report.capabilityViolations.length > 0 ||
		(report.staleEffortEntries.length > 0 && !options.allowStale) ||
		(report.unmeasuredReasoningModels.length > 0 && !options.allowUnmeasured)
	);
}
