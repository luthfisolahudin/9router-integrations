import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { nineRouterPack, packs } from "../src/index.ts";
import { MEASURED_WIRE_EFFORT } from "../src/effort.ts";
import { CAPABILITY_INVARIANTS } from "../src/invariants.ts";

const ROOT = join(import.meta.dirname, "../../..");

test("every measured effort has a line in the effort matrix", () => {
	const matrix = readFileSync(join(ROOT, "docs/EFFORT_MATRIX.md"), "utf8");
	for (const id of Object.keys(MEASURED_WIRE_EFFORT)) {
		assert.ok(matrix.includes(id), `docs/EFFORT_MATRIX.md has no evidence for ${id}`);
	}
});

test("the pinned fallback and the excluded ids never overlap", () => {
	const excluded = new Set(nineRouterPack.filter?.excludeIds ?? []);
	for (const entry of nineRouterPack.fallback ?? []) {
		assert.equal(excluded.has(entry.id), false, `${entry.id} is both a fallback and excluded`);
	}
});

test("curated entries exist for every fallback id, so an offline start keeps its facts", () => {
	for (const entry of nineRouterPack.fallback ?? []) {
		const facts = nineRouterPack.curated?.[entry.id];
		assert.ok(facts !== undefined, `no curated facts for fallback ${entry.id}`);
		assert.ok((facts.input?.length ?? 0) > 0, `${entry.id} has no modality facts`);
	}
});

test("invariants stay curation, not a copy of the whole catalog", () => {
	assert.ok(CAPABILITY_INVARIANTS.length > 0);
	assert.ok(CAPABILITY_INVARIANTS.length <= 20, "invariants should be the facts worth asserting, not every model");
	for (const invariant of CAPABILITY_INVARIANTS) {
		assert.ok(Object.keys(invariant.expected).length > 0, invariant.id);
		assert.ok(invariant.note.trim().length > 10, `${invariant.id} needs a note explaining the source`);
	}
});

test("the repo ships exactly one pack", () => {
	assert.equal(packs.length, 1);
	assert.equal(packs[0]?.id, "9router");
});
