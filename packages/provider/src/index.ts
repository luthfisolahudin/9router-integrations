import type { Pack } from "@luthfisolahudin/ai-integrations-contract";

import { MEASURED_WIRE_EFFORT } from "./effort.ts";
import { CAPABILITY_INVARIANTS, type CapabilityInvariant } from "./invariants.ts";
import { nineRouterPack } from "./pack.ts";

export { nineRouterPack };
export { MEASURED_WIRE_EFFORT } from "./effort.ts";
export { CAPABILITY_INVARIANTS } from "./invariants.ts";
export type { CapabilityInvariant } from "./invariants.ts";

/** The packs this repo ships. Adapters and the conformance suite read this only. */
export const packs: readonly Pack[] = [nineRouterPack];

/** Ids with a measured effort, used to populate `provenance.effort`. */
export const measuredIds: ReadonlySet<string> = new Set(Object.keys(MEASURED_WIRE_EFFORT));

export const invariants: readonly CapabilityInvariant[] = CAPABILITY_INVARIANTS;

/** Where this vendor's fixture lives; the CLI reads it through #provider. */
export const fixture = new URL("../fixtures/catalog.json", import.meta.url);

/** One object per provider checkout, so host wiring stays one line. */
export const provider = {
	packs,
	effort: MEASURED_WIRE_EFFORT,
	measuredIds,
	invariants,
	fixture,
} as const;
