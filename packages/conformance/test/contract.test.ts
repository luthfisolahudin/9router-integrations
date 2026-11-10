import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { checkAgentFiles, checkProviderShape, checkSkills } from "@repo/cli";
import { PACK_SCHEMA_VERSION, validatePack, type Pack } from "@repo/contract";
import { packs as tierB } from "@repo/example-tier-b";
import { packs as tierC } from "@repo/example-tier-c";
import { packs as provider } from "@repo/provider";

const ROOT = join(import.meta.dirname, "../../..");
const ALL: Pack[] = [...provider, ...tierB, ...tierC];

test("every pack validates and matches the current schema", () => {
	for (const pack of ALL) {
		assert.doesNotThrow(() => validatePack(pack), pack.id);
		assert.equal(pack.schemaVersion, PACK_SCHEMA_VERSION, pack.id);
	}
});

test("pack ids are unique and URL-shaped", () => {
	const ids = ALL.map((pack) => pack.id);
	assert.equal(new Set(ids).size, ids.length);
	for (const pack of ALL) assert.match(pack.baseUrl, /^https:\/\//, pack.id);
});

test("agent files and the symlink pair are intact", () => {
	const { failures } = checkAgentFiles(ROOT);
	assert.deepEqual(failures, []);
});

test("every skill parses and references real tasks and paths", () => {
	const { failures } = checkSkills(ROOT);
	assert.deepEqual(failures, []);
});

test("the vendor surface keeps its required shape", () => {
	const { failures } = checkProviderShape(ROOT);
	assert.deepEqual(failures, []);
});

test("no credential-shaped literal is committed", () => {
	const offenders: string[] = [];
	const patterns = [
		/\bsk-[A-Za-z0-9_-]{16,}/,
		/\bBearer\s+[A-Za-z0-9._-]{20,}/,
		/\b[A-Za-z0-9_-]{40,}\b(?=.*(key|token|secret))/i,
	];
	walk(ROOT, (path) => {
		const relative = path.slice(ROOT.length + 1).split("\\").join("/");
		if (!/\.(ts|json|md|yaml|yml)$/.test(relative)) return;
		if (relative === "pnpm-lock.yaml") return;
		const source = readFileSync(path, "utf8");
		for (const pattern of patterns) {
			if (pattern.test(source)) offenders.push(`${relative} matches ${pattern}`);
		}
	});
	assert.deepEqual(offenders, []);
});

function walk(directory: string, visit: (path: string) => void): void {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) walk(path, visit);
		else if (entry.isFile() && statSync(path).size < 200_000) visit(path);
	}
}
