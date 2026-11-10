import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { capabilityView, inputModalities, type RawRecord } from "@repo/contract";

import { examplePack, invariants, packs } from "../src/index.ts";

const payload = JSON.parse(readFileSync(join(import.meta.dirname, "../fixtures/catalog.json"), "utf8")) as {
	data: RawRecord[];
};

test("the fixture is shaped as the pack expects", () => {
	assert.ok(Array.isArray(payload.data));
	assert.deepEqual(payload.data.map((record) => record.id).sort(), [
		"example-chat-1",
		"example-chat-cheap",
		"example-reason-kimi",
	]);
});

test("every declared pack is exposed to the adapters", () => {
	assert.equal(packs.length, 1);
	assert.equal(packs[0], examplePack);
});

test("the pack keeps a minimal pinned fallback so the provider is never empty", () => {
	assert.ok((examplePack.fallback ?? []).length > 0);
	assert.ok((examplePack.fallback ?? []).length <= 3);
});

test("invariants reference existing models and hold against the fixture", () => {
	const byId = new Map(payload.data.map((record) => [String(record.id), record]));
	for (const invariant of invariants) {
		const record = byId.get(invariant.id);
		assert.ok(record, `invariant references a missing model: ${invariant.id}`);
		const view = capabilityView(record, examplePack.fields);
		for (const [key, expected] of Object.entries(invariant.expected)) {
			if (key === "vision") assert.equal(inputModalities(view).includes("image"), expected, `${invariant.id} vision`);
			else if (key === "pdf") assert.equal(inputModalities(view).includes("pdf"), expected, `${invariant.id} pdf`);
			else if (key === "videoInput") {
				assert.equal(inputModalities(view).includes("video"), expected, `${invariant.id} videoInput`);
			} else if (key === "contextWindow") assert.equal(view.contextWindow, expected, `${invariant.id} contextWindow`);
			else if (key === "maxOutput") assert.equal(view.maxOutput, expected, `${invariant.id} maxOutput`);
			else if (key === "reasoning") assert.equal(view.reasoning, expected, `${invariant.id} reasoning`);
			else if (key === "tools") assert.equal(view.tools, expected, `${invariant.id} tools`);
			else assert.fail(`unhandled invariant key: ${key}`);
		}
	}
});

test("the provider declares where its facts live, not what they are", () => {
	assert.ok(examplePack.fields?.contextWindow?.length);
	assert.ok(examplePack.fields?.reasoning?.length);
	assert.equal(examplePack.auth?.apiKeyEnv, "EXAMPLE_API_KEY");
});
