import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { capabilityView, type RawRecord } from "@repo/contract";

import { invariants, packs } from "../src/index.ts";

/**
 * Sanity gate for the vendor surface. It stays contract-only on purpose: the
 * provider package may not import the catalog, so value assertions against
 * projected models live in `task check:catalog` and the conformance suite.
 */
const payload = JSON.parse(readFileSync(join(import.meta.dirname, "../fixtures/catalog.json"), "utf8")) as
	| RawRecord[]
	| { data?: RawRecord[]; models?: RawRecord[] };

const pack = packs[0]!;
const records: RawRecord[] = Array.isArray(payload) ? payload : (payload.data ?? payload.models ?? []);
const fixtureIds = new Set(records.map((record) => String(record.id)));

test("the fixture is a catalog the pack can read", () => {
	assert.ok(records.length > 0, "packages/provider/fixtures/catalog.json has no records");
	assert.ok(fixtureIds.size === records.length, "the fixture contains duplicate ids");
});

test("every curated id exists in the fixture", () => {
	for (const id of Object.keys(pack.curated ?? {})) {
		assert.ok(fixtureIds.has(id), `curated entry "${id}" is not in the fixture (typo or retired model)`);
	}
});

test("every pinned fallback id exists in the fixture", () => {
	for (const entry of pack.fallback ?? []) {
		assert.ok(fixtureIds.has(entry.id), `fallback "${entry.id}" is not in the fixture`);
	}
	assert.ok((pack.fallback ?? []).length <= 3, "keep the fallback minimal; it is a floor, not a catalog");
});

test("every invariant id exists in the fixture", () => {
	for (const invariant of invariants) {
		assert.ok(fixtureIds.has(invariant.id), `invariant references a missing model: ${invariant.id}`);
	}
});

test("the pack declares where its facts live", () => {
	assert.ok(pack.fields?.contextWindow?.length, "fields.contextWindow is required");
	assert.ok(pack.fields?.reasoning?.length, "fields.reasoning is required");
});

test("the pack names its credential source or is explicitly keyless", () => {
	const auth = pack.auth;
	assert.ok(auth?.apiKeyEnv !== undefined || auth?.apiKey !== undefined || auth?.kind === "none");
});

test("capability reads never throw on the real payload", () => {
	for (const record of records) {
		assert.doesNotThrow(() => capabilityView(record, pack.fields), String(record.id));
	}
});

test("the repo declares at least one pack", () => {
	assert.ok(packs.length >= 1);
});
