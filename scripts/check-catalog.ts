import { fetchCatalog } from "../src/catalog.ts";
import { buildCatalogReport } from "../src/check-report.ts";

const allowUnmeasured = process.argv.includes("--allow-unmeasured");
const allowStale = process.argv.includes("--allow-stale");

const records = await fetchCatalog();
const {
	projectionFailures,
	capabilityViolations,
	staleEffortEntries,
	unmeasuredReasoningModels,
	absentInvariants,
} = buildCatalogReport(records);

if (projectionFailures.length > 0) {
	console.error("9Router integration check failed: a catalog record crashes a client projection.");
	for (const failure of projectionFailures) console.error(`- ${failure}`);
	process.exitCode = 1;
}

if (capabilityViolations.length > 0) {
	console.error("9Router catalog capabilities contradict curated ground truth:");
	for (const violation of capabilityViolations) console.error(`- ${violation}`);
	console.error("Fix the router capability table (or the invariant if reality changed), then re-run.");
	process.exitCode = 1;
}

if (staleEffortEntries.length > 0) {
	console.error("src/effort.ts has measured efforts for models absent from the live catalog:");
	for (const modelId of staleEffortEntries) console.error(`- ${modelId}`);
	console.error("Remove each entry (and its docs/EFFORT_MATRIX.md bullet) once confirmed retired.");
	if (!allowStale) process.exitCode = 1;
}

if (unmeasuredReasoningModels.length > 0) {
	console.error("9Router catalog has reasoning models without measured wire effort:");
	for (const modelId of unmeasuredReasoningModels) console.error(`- ${modelId}`);
	console.error("These models remain visible but do not receive an explicit reasoning effort.");
	console.error("Probe the route, then add each model to src/effort.ts and docs/EFFORT_MATRIX.md.");
	if (!allowUnmeasured) process.exitCode = 1;
}

if (absentInvariants.length > 0) {
	// Informational: a retired model is not a failure, but curation should follow it.
	console.error("Note: curated capability invariants reference models absent from the live catalog:");
	for (const modelId of absentInvariants) console.error(`- ${modelId}`);
	console.error("Remove the invariant if the retirement is intentional.");
}

const failed =
	projectionFailures.length > 0 ||
	capabilityViolations.length > 0 ||
	(staleEffortEntries.length > 0 && !allowStale) ||
	(unmeasuredReasoningModels.length > 0 && !allowUnmeasured);

if (failed) {
	process.exitCode = 1;
} else {
	console.log(
		`9Router catalog OK: ${records.length} model(s) projected for OpenCode and Pi; capability invariants hold.`,
	);
}
