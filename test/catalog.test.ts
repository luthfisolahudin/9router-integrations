import assert from "node:assert/strict";
import test from "node:test";

import { parseCatalog, resolveBaseUrl } from "../src/catalog.ts";

test("preserves exact catalog membership", () => {
	const records = parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, { id: "cbcn/kimi-k3" }] });
	assert.deepEqual(records.map(({ id }) => id), ["cbcn/glm-5.2", "cbcn/kimi-k3"]);
});

test("rejects malformed and duplicate records instead of dropping them", () => {
	assert.throws(() => parseCatalog({ data: [{ id: "cbcn/glm-5.2" }, {}] }), /usable id/);
	assert.throws(() => parseCatalog({ data: [{ id: "same" }, { id: "same" }] }), /duplicate/);
});

test("normalizes base URLs with or without v1", () => {
	assert.equal(resolveBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128");
});
