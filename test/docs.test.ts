import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MEASURED_WIRE_EFFORT } from "../src/effort.ts";

const DOCS_PATH = new URL("../docs/EFFORT_MATRIX.md", import.meta.url);

/** Extracts `- \`model-id\`: client \`max\` -> wire \`xhigh\`` bullets from the matrix. */
function parseMatrixBullets(markdown: string): Map<string, string> {
	const bullets = new Map<string, string>();
	for (const line of markdown.split("\n")) {
		const match = /^- `([^`]+)`: client `[^`]+` -> wire `([^`]+)`$/.exec(line.trim());
		if (match) bullets.set(match[1], match[2]);
	}
	return bullets;
}

test("docs/EFFORT_MATRIX.md bullets match the measured effort table exactly", async () => {
	const markdown = await readFile(DOCS_PATH, "utf8");
	const documented = parseMatrixBullets(markdown);
	const measured = new Map(Object.entries(MEASURED_WIRE_EFFORT));

	const undocumented = [...measured.keys()].filter((id) => !documented.has(id));
	const stale = [...documented.keys()].filter((id) => !measured.has(id));
	const mismatched = [...measured].filter(([id, effort]) => documented.get(id) !== undefined && documented.get(id) !== effort);

	assert.deepEqual(undocumented, [], "effort entries missing a docs/EFFORT_MATRIX.md bullet (the check script instructs adding them)");
	assert.deepEqual(stale, [], "docs bullets for models no longer in the effort table");
	assert.deepEqual(mismatched, [], "docs bullets disagreeing with the measured wire effort");
});

test("every docs bullet records the same client-facing max level", async () => {
	const markdown = await readFile(DOCS_PATH, "utf8");
	for (const [id, effort] of parseMatrixBullets(markdown)) {
		assert.match(effort, /^(xhigh|max)$/, `${id}: unexpected wire effort ${effort}`);
	}
});
