import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { toOpencodeModels } from "@repo/adapter-opencode/model";
import { toPiModels } from "@repo/adapter-pi/model";
import { buildModels } from "@repo/catalog";
import type { Pack, RawRecord } from "@repo/contract";
import { packs as tierB } from "@repo/example-tier-b";
import { packs as tierC } from "@repo/example-tier-c";
import { MEASURED_WIRE_EFFORT, measuredIds, packs as provider } from "@repo/provider";

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

for (const entry of CORPUS) {
	test(`${entry.pack.id}: both hosts project the corpus fixture`, () => {
		const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
		assert.ok(models.length > 0, "no models projected");

		const host = { providerId: entry.pack.id, baseUrl: entry.pack.baseUrl };
		const pi = toPiModels(models, MEASURED_WIRE_EFFORT, host);
		const opencode = toOpencodeModels(models, MEASURED_WIRE_EFFORT);

		const expected = models.filter((model) => model.excluded === undefined).map((model) => model.id).sort();
		assert.deepEqual(pi.map((model) => model.id).sort(), expected, `${entry.pack.id} pi membership`);
		assert.deepEqual(opencode.map((model) => model.id).sort(), expected, `${entry.pack.id} opencode membership`);

		for (const model of pi) {
			assert.equal(model.provider, entry.pack.id);
			assert.equal(model.baseUrl, entry.pack.baseUrl);
			assert.ok(model.contextWindow > 0);
			assert.ok(model.maxTokens > 0);
		}
	});
}

test("tier a keeps an unmapped thinking format out of the effort menu", () => {
	const entry = CORPUS[0]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	const kimi = models.find((model) => model.id === "example-reason-kimi");
	assert.ok(kimi);
	const projected = toPiModels(models, MEASURED_WIRE_EFFORT, { providerId: entry.pack.id, baseUrl: entry.pack.baseUrl });
	const kimiProjected = projected.find((model) => model.id === "example-reason-kimi");
	assert.equal(kimiProjected?.thinkingLevelMap, undefined);
	assert.notEqual(kimiProjected?.compat?.thinkingFormat, "kimi");
});

test("tier b hides the offline model but keeps it in the model list", () => {
	const entry = CORPUS[1]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	const offline = models.find((model) => model.id === "tier-b-offline");
	assert.equal(offline?.excluded?.reason, "offline");
	const projected = toOpencodeModels(models, MEASURED_WIRE_EFFORT);
	assert.equal(projected.some((model) => model.id === "tier-b-offline"), false);
});

test("tier c reports curated and default provenance separately", () => {
	const entry = CORPUS[2]!;
	const models = buildModels(entry.pack, records(entry.fixture), { measuredIds });
	const curated = models.find((model) => model.id === "tier-c-chat");
	const defaulted = models.find((model) => model.id === "tier-c-small");
	assert.equal(curated?.provenance.limits.context, "curated");
	assert.equal(defaulted?.provenance.limits.context, "default");
	assert.equal(defaulted?.provenance.effort, "default");
});
