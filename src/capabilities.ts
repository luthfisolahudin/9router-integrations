import type { CatalogRecord } from "./catalog.ts";
import { catalogCapabilities } from "./catalog.ts";
import { measuredWireEffort, type WireEffort } from "./effort.ts";

/**
 * Shared read-side view of one catalog record's capabilities.
 *
 * `plugins/opencode.ts` and `extensions/pi.ts` both read the same loose
 * capability flags before projecting into their client-specific shapes. This
 * centralizes those reads so the flag semantics (strict `=== true` checks,
 * effort gated behind reasoning, tri-state `tools`) have one definition.
 * Client-specific concerns (modalities arrays, limit fallbacks, variant maps)
 * stay in each projection.
 */
export interface CapabilityView {
	/** Strict `reasoning === true` read. */
	readonly reasoning: boolean;
	/** Measured wire effort, present only for measured reasoning models. */
	readonly effort: WireEffort | undefined;
	readonly vision: boolean;
	readonly audioInput: boolean;
	readonly videoInput: boolean;
	readonly pdf: boolean;
	readonly imageOutput: boolean;
	readonly audioOutput: boolean;
	/** Tri-state: `undefined` when the router did not send a boolean. */
	readonly tools: boolean | undefined;
	/** Raw router values; no client fallback is applied here. */
	readonly contextWindow: number | undefined;
	readonly maxOutput: number | undefined;
}

/**
 * Reads one catalog record's capabilities into a normalized view.
 *
 * Numeric limits accept finite numbers only: `typeof NaN === "number"`, so a
 * broken router payload would otherwise reach OpenCode's `limit` as
 * `NaN`. Client-specific defaults stay in each projection.
 */
export function capabilityView(record: CatalogRecord): CapabilityView {
	const capabilities = catalogCapabilities(record);
	const reasoning = capabilities.reasoning === true;
	return {
		reasoning,
		// Client max maps to the measured wire value; see docs/EFFORT_MATRIX.md.
		effort: reasoning ? measuredWireEffort(record.id) : undefined,
		vision: capabilities.vision === true,
		audioInput: capabilities.audioInput === true,
		videoInput: capabilities.videoInput === true,
		pdf: capabilities.pdf === true,
		imageOutput: capabilities.imageOutput === true,
		audioOutput: capabilities.audioOutput === true,
		tools: typeof capabilities.tools === "boolean" ? capabilities.tools : undefined,
		contextWindow: Number.isFinite(capabilities.contextWindow) ? (capabilities.contextWindow as number) : undefined,
		maxOutput: Number.isFinite(capabilities.maxOutput) ? (capabilities.maxOutput as number) : undefined,
	};
}
