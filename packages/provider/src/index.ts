import type { Pack } from "@luthfisolahudin/9router-integrations-contract";

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
