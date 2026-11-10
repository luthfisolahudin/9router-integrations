import type { Pack } from "@luthfisolahudin/ai-provider-integrations-template-contract";

import { MEASURED_WIRE_EFFORT } from "./effort.ts";
import { CAPABILITY_INVARIANTS, type CapabilityInvariant } from "./invariants.ts";
import { examplePack } from "./pack.ts";

export { examplePack };
export { MEASURED_WIRE_EFFORT } from "./effort.ts";
export { CAPABILITY_INVARIANTS } from "./invariants.ts";
export type { CapabilityInvariant } from "./invariants.ts";

/**
 * The packs this repo ships. Adapters and the conformance suite read this and
 * nothing else, so adding a second endpoint to one repo is one array entry.
 */
export const packs: readonly Pack[] = [examplePack];

/** Ids with a measured effort, used to populate `provenance.effort`. */
export const measuredIds: ReadonlySet<string> = new Set(Object.keys(MEASURED_WIRE_EFFORT));

export const invariants: readonly CapabilityInvariant[] = CAPABILITY_INVARIANTS;
