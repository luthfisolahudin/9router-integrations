import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { toOpencodeModels } from "@repo/adapter-opencode/model";
import { toPiModels } from "@repo/adapter-pi/model";
import { buildModels } from "@repo/catalog";
import { PACK_SCHEMA_VERSION, type Pack, type RawRecord } from "@repo/contract";
import { packs as tierB } from "@repo/example-tier-b";
import { packs as tierC } from "@repo/example-tier-c";
import { MEASURED_WIRE_EFFORT, measuredIds, packs as provider } from "@repo/provider";

/**
 * Template-only corpus. `provider-init` deletes this file together with
 * `examples/`, because a downstream repo ships one provider and one catalog
 * quality, not three.
 */
const ROOT = join(import.meta.dirname, "../../..");

interface CorpusEntry {
	pack: Pack;
	fixture: string;
}

const CORPUS: CorpusEntry[] = [
	{ pack: provider[0]!, fixture: "packages/provider/fixtures/catalog.json" },
	{ pack: tierB[0]!, fixture: "examples/tier-b/fixtures/catalog.json" },
	{ pack: tierC[0]!, fixture: "examples/tier-c/fixtures/catalog.json" },
];

function records(path: string): RawRecord[] {
	const payload = JSON.parse(readFileSync(join(ROOT, path), "utf8")) as { data?: RawRecord[] };
	assert.ok(Array.isArray(payload.data), `${path} has no data[]`);
	return payload.data;
}

test("the corpus covers all three catalog qualities", () => {
	assert.equal(CORPUS.length, 3);
	assert.equal(new Set(CORPUS.map((entry) => entry.pack.id)).size, 3);
});

test("every corpus pack validates and matches the current schema", () => {
	for (const entry of CORPUS) {
		assert.equal(entry.pack.schemaVersion, PACK_SCHEMA_VERSION, entry.pack.id);
		assert.match(entry.pack.baseUrl, /^https:\/\//, entry.pack.id);
	}
});

for (const entry of CORPUS) {
	test(`${entry.pack.id}: projects through both hosts`, () => {
		const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
		assert.ok(models.length > 0);
		const host = { providerId: entry.pack.id, baseUrl: entry.pack.baseUrl };
		const pi = toPiModels(models, MEASURED_WIRE_EFFORT, host);
		const opencode = toOpencodeModels(models, MEASURED_WIRE_EFFORT);
		const expected = models
			.filter((model) => model.excluded === undefined)
			.map((model) => model.id)
			.sort();
		assert.deepEqual(pi.map((model) => model.id).sort(), expected);
		assert.deepEqual(opencode.map((model) => model.id).sort(), expected);
	});
}

test("tier a keeps an unmapped thinking format out of the effort menu", () => {
	const entry = CORPUS[0]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	const projected = toPiModels(models, MEASURED_WIRE_EFFORT, {
		providerId: entry.pack.id,
		baseUrl: entry.pack.baseUrl,
	});
	const kimi = projected.find((model) => model.id === "example-reason-kimi");
	assert.ok(kimi);
	assert.equal(kimi.thinkingLevelMap, undefined);
	assert.notEqual(kimi.compat?.thinkingFormat, "kimi");
});

test("tier b hides the offline model but keeps it in the model list", () => {
	const entry = CORPUS[1]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	assert.equal(models.find((model) => model.id === "tier-b-offline")?.excluded?.reason, "offline");
	assert.equal(toOpencodeModels(models, MEASURED_WIRE_EFFORT).some((model) => model.id === "tier-b-offline"), false);
});

test("tier c reports curated and default provenance separately", () => {
	const entry = CORPUS[2]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	assert.equal(models.find((model) => model.id === "tier-c-chat")?.provenance.limits.context, "curated");
	assert.equal(models.find((model) => model.id === "tier-c-small")?.provenance.limits.context, "default");
	assert.equal(models.find((model) => model.id === "tier-c-small")?.provenance.effort, "default");
});
