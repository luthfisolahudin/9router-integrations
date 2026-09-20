import assert from "node:assert/strict";
import test from "node:test";

import { DROPPED_MODEL_IDS, KNOWN_MODEL_NAMES, resolveBaseUrl } from "../src/catalog.ts";
import { MEASURED_WIRE_EFFORT } from "../src/effort.ts";
import { CAPABILITY_INVARIANTS } from "../src/invariants.ts";

/** Catalog ids are `owner/slug`; catch typos like a missing owner or stray space. */
const CANONICAL_ID = /^[a-z0-9-]+\/[a-z0-9][a-z0-9.\-]*$/;

function assertCanonicalIds(source: string, ids: readonly string[]): void {
	for (const id of ids) {
		assert.match(id, CANONICAL_ID, `${source} entry ${JSON.stringify(id)} is not a canonical owner/slug id`);
	}
}

function assertUniqueIds(source: string, ids: readonly string[]): void {
	assert.equal(new Set(ids).size, ids.length, `${source} contains duplicate ids`);
}

test("curated id tables keep canonical owner/slug ids", () => {
	assertCanonicalIds("MEASURED_WIRE_EFFORT", Object.keys(MEASURED_WIRE_EFFORT));
	assertCanonicalIds("DROPPED_MODEL_IDS", [...DROPPED_MODEL_IDS]);
	assertCanonicalIds("KNOWN_MODEL_NAMES", Object.keys(KNOWN_MODEL_NAMES));
	assertCanonicalIds("CAPABILITY_INVARIANTS", CAPABILITY_INVARIANTS.map(({ id }) => id));
});

test("capability invariants stay unique and well-formed", () => {
	const ids = CAPABILITY_INVARIANTS.map(({ id }) => id);
	assertUniqueIds("CAPABILITY_INVARIANTS", ids);
	for (const invariant of CAPABILITY_INVARIANTS) {
		const keys = Object.keys(invariant.expected);
		assert.ok(keys.length > 0, `${invariant.id} asserts nothing`);
		assert.ok(invariant.note.trim().length > 10, `${invariant.id} has no usable curation note`);
	}
});

test("the default base URL is loopback http", () => {
	// Discovery must never default to a remote host or an implicit https.
	const url = new URL(resolveBaseUrl());
	assert.equal(url.protocol, "http:");
	assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), `unexpected default host ${url.hostname}`);
});
