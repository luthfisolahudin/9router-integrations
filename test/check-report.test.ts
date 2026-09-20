import assert from "node:assert/strict";
import test from "node:test";

import type { CatalogRecord } from "../src/catalog.ts";
import { buildCatalogReport } from "../src/check-report.ts";
import { catalogFixture } from "./helpers.ts";

// Replica of the live 14-model catalog with invariant-satisfying capabilities,
// so a clean report means "exactly what the router serves today".
const LIVE_CATALOG: CatalogRecord[] = [
	{ id: "cbcn/minimax-m3", capabilities: { vision: true, reasoning: true } },
	{ id: "cbcn/glm-5.3", capabilities: { vision: true, reasoning: true } },
	{ id: "cbcn/glm-5.3-flash", capabilities: { vision: true, reasoning: true } },
	{ id: "cbcn/kimi-k3", capabilities: { vision: true, reasoning: true, videoInput: true } },
	{ id: "cbcn/deepseek-v4.1-flash", capabilities: { vision: true, reasoning: true, tools: true } },
	{ id: "cx/gpt-6-astra", capabilities: { reasoning: true } },
	{ id: "cx/gpt-5.6-sol", capabilities: { reasoning: true } },
	{ id: "cx/gpt-5.6-terra", capabilities: { vision: true, reasoning: true } },
	{ id: "cx/gpt-5.6-luna", capabilities: { reasoning: true } },
	{ id: "cx/gpt-5.5", capabilities: { reasoning: true } },
	{ id: "ag/gemini-3.8-flash-high", capabilities: { vision: true, audioInput: true, videoInput: true, reasoning: true } },
	{ id: "ag/claude-sonnet-4-6", capabilities: { vision: true, reasoning: true } },
	{ id: "ag/claude-opus-4-6-thinking", capabilities: { vision: true, reasoning: true } },
	{ id: "ag/gpt-oss-120b-medium", capabilities: { vision: false, reasoning: true } },
];

function recordsFrom(...records: CatalogRecord[]): CatalogRecord[] {
	return JSON.parse(catalogFixture(...records)).data;
}

test("passes the full live-shaped catalog with no findings", () => {
	const report = buildCatalogReport(recordsFrom(...LIVE_CATALOG));
	assert.deepEqual(report.projectionFailures, []);
	assert.deepEqual(report.capabilityViolations, []);
	assert.deepEqual(report.staleEffortEntries, []);
	assert.deepEqual(report.unmeasuredReasoningModels, []);
	assert.deepEqual(report.absentInvariants, []);
});

test("reports a projection crash with client and model id", () => {
	// A malicious/broken router payload can smuggle throwing getters past the
	// isRecord guard; the report must catch the crash per client, not die.
	const capabilities: Record<string, unknown> = { reasoning: true };
	Object.defineProperty(capabilities, "pdf", {
		enumerable: true,
		get() {
			throw new TypeError("poisoned pdf flag");
		},
	});
	const report = buildCatalogReport([{ id: "cbcn/exploding-model", capabilities }]);
	assert.equal(report.projectionFailures.length, 2);
	assert.match(report.projectionFailures[0], /^OpenCode cbcn\/exploding-model: poisoned pdf flag$/);
	assert.match(report.projectionFailures[1], /^Pi cbcn\/exploding-model: poisoned pdf flag$/);
});

test("flags reasoning models without a measured effort entry", () => {
	const report = buildCatalogReport(
		recordsFrom({ id: "cbcn/glm-5.3", capabilities: { reasoning: true } }, { id: "cbcn/unmeasured-reasoner", capabilities: { reasoning: true } }),
	);
	assert.deepEqual(report.unmeasuredReasoningModels, ["cbcn/unmeasured-reasoner"]);
});

test("ignores unmeasured models that do not reason", () => {
	const report = buildCatalogReport(recordsFrom({ id: "cbcn/plain-text", capabilities: {} }));
	assert.deepEqual(report.unmeasuredReasoningModels, []);
});

test("flags measured efforts for models absent from the live catalog", () => {
	const report = buildCatalogReport(recordsFrom({ id: "cx/gpt-5.5", capabilities: { reasoning: true } }));
	assert.ok(report.staleEffortEntries.length > 0);
	assert.ok(report.staleEffortEntries.every((id) => id !== "cx/gpt-5.5"));
});

test("reports capability contradictions with key, actual, and expected", () => {
	const report = buildCatalogReport(
		recordsFrom({ id: "ag/gpt-oss-120b-medium", capabilities: { vision: true, reasoning: true } }),
	);
	assert.equal(report.capabilityViolations.length, 1);
	assert.match(
		report.capabilityViolations[0],
		/ag\/gpt-oss-120b-medium: capabilities\.vision is true, expected false/,
	);
});

test("lists curated models absent from the catalog as informational", () => {
	const report = buildCatalogReport(recordsFrom({ id: "cx/gpt-5.5", capabilities: { reasoning: true } }));
	assert.ok(report.absentInvariants.includes("cbcn/deepseek-v4.1-flash"));
	assert.ok(!report.capabilityViolations.some((line) => line.startsWith("cbcn/deepseek-v4.1-flash")));
});

test("flags curated display names for retired models without failing the report", () => {
	const report = buildCatalogReport(recordsFrom({ id: "cx/gpt-5.5", capabilities: { reasoning: true } }));
	assert.ok(report.staleDisplayNameEntries.length > 0);
	assert.ok(report.staleDisplayNameEntries.every((id) => id !== "cx/gpt-5.5"));
	// Informational only: staleness must not show up as a hard failure.
	assert.ok(!report.capabilityViolations.some((line) => line.startsWith("ag/gemini-3.8-flash-high")));
});

test("reports no stale display names for the full live-shaped catalog", () => {
	const report = buildCatalogReport(recordsFrom(...LIVE_CATALOG));
	assert.deepEqual(report.staleDisplayNameEntries, []);
});
