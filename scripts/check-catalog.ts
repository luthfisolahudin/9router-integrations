import { catalogCapabilities, fetchCatalog } from "../src/catalog.ts";
import { measuredWireEffort } from "../src/effort.ts";
import { toOpenCodeModel } from "../plugins/opencode.ts";
import { toPiModel } from "../extensions/pi.ts";

const allowUnmeasured = process.argv.includes("--allow-unmeasured");

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

const records = await fetchCatalog();
const projectionFailures: string[] = [];
const unmeasuredReasoningModels: string[] = [];

for (const record of records) {
	try {
		toOpenCodeModel(record);
	} catch (error) {
		projectionFailures.push(`OpenCode ${record.id}: ${formatError(error)}`);
	}
	try {
		toPiModel(record);
	} catch (error) {
		projectionFailures.push(`Pi ${record.id}: ${formatError(error)}`);
	}

	if (catalogCapabilities(record).reasoning === true && measuredWireEffort(record.id) === undefined) {
		unmeasuredReasoningModels.push(record.id);
	}
}

if (projectionFailures.length > 0) {
	console.error("9Router integration check failed: a catalog record crashes a client projection.");
	for (const failure of projectionFailures) console.error(`- ${failure}`);
	process.exitCode = 1;
}

if (unmeasuredReasoningModels.length > 0) {
	console.error("9Router catalog has reasoning models without measured wire effort:");
	for (const modelId of unmeasuredReasoningModels) console.error(`- ${modelId}`);
	console.error("These models remain visible but do not receive an explicit reasoning effort.");
	console.error("Probe the route, then add each model to src/effort.ts and docs/EFFORT_MATRIX.md.");
	if (!allowUnmeasured) process.exitCode = 1;
}

if (projectionFailures.length === 0 && (unmeasuredReasoningModels.length === 0 || allowUnmeasured)) {
	console.log(`9Router catalog OK: ${records.length} model(s) projected for OpenCode and Pi.`);
}
