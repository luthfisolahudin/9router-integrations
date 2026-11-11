import { readFileSync, writeFileSync } from "node:fs";

const edit = (path, pairs) => {
	let source = readFileSync(path, "utf8");
	for (const [from, to] of pairs) {
		if (!source.includes(from)) throw new Error(`anchor not found in ${path}: ${from.slice(0, 70)}`);
		source = source.split(from).join(to);
	}
	writeFileSync(path, source);
};

// --- contract: facts may declare efforts; the pack may resolve a key from files
edit("packages/contract/src/record.ts", [
	[
		"\t/** Explicit USD per 1M override; beats the models.dev hint. */\n\tcost?: Partial<ModelCost>;",
		"\t/** Effort levels the provider's own catalog declares. */\n\tefforts?: string[];\n\t/** Explicit USD per 1M override; beats the models.dev hint. */\n\tcost?: Partial<ModelCost>;",
	],
	[
		"\tthinking: ThinkingFacts;\n\tcost: ModelCost;",
		"\tthinking: ThinkingFacts;\n\t/** Wire API for this model when the provider mixes routes. */\n\tapi?: string;\n\tcost: ModelCost;",
	],
]);

edit("packages/contract/src/pack.ts", [
	[
		"\tauth?: {\n\t\tkind: \"bearer\" | \"none\";\n\t\tapiKeyEnv?: string;\n\t\tapiKey?: string;\n\t};",
		"\tauth?: {\n\t\tkind: \"bearer\" | \"none\";\n\t\tapiKeyEnv?: string;\n\t\tapiKey?: string;\n\t\t/**\n\t\t * JSON files to read a key from when the environment has none, in order.\n\t\t * Each file is read as `{ apiKey }` or `{ apiKeys: [first] }`.\n\t\t */\n\t\tkeyFiles?: { path: string; keys: (\"apiKey\" | \"apiKeys\")[] }[];\n\t};",
	],
	[
		"\t\tthinkingCanDisable?: string[];",
		"\t\tthinkingCanDisable?: string[];\n\t\tefforts?: string[];",
	],
	[
		"\tif (pack.filter?.nonChatPattern !== undefined) {",
		"\tif (pack.auth?.keyFiles !== undefined) {\n\t\tfor (const file of pack.auth.keyFiles) {\n\t\t\tif (file.path.trim().length === 0) throw new Error(`pack \"${pack.id}\": auth.keyFiles needs a path`);\n\t\t}\n\t}\n\tif (pack.filter?.nonChatPattern !== undefined) {",
	],
]);

// --- contract: capabilityView exposes declared efforts
edit("packages/contract/src/capabilities.ts", [
	[
		"\treadonly declaredInput: string[] | undefined;",
		"\treadonly declaredInput: string[] | undefined;\n\treadonly declaredEfforts: string[] | undefined;",
	],
	[
		"\t\tdeclaredInput: firstStringArray(record, fields.inputModalities),",
		"\t\tdeclaredInput: firstStringArray(record, fields.inputModalities),\n\t\tdeclaredEfforts: firstStringArray(record, fields.efforts),",
	],
]);

// --- catalog: efforts from facts, per-model api via hooks.route, key files
edit("packages/catalog/src/provenance.ts", [
	[
		"\tconst declaredEfforts = !measured && hint?.efforts !== undefined ? hint.efforts : undefined;",
		"\t// A declared enum can come from the provider's own catalog (this is the\n\t// strongest form of declaration) or from models.dev.\n\tconst catalogEfforts = effective.efforts;\n\tconst declaredEfforts =\n\t\t!measured && catalogEfforts !== undefined\n\t\t\t? catalogEfforts\n\t\t\t: !measured && hint?.efforts !== undefined\n\t\t\t\t? hint.efforts\n\t\t\t\t: undefined;",
	],
	[
		"\t\t\teffort: measured ? \"measured\" : declaredEfforts === undefined ? \"default\" : \"models.dev\",",
		"\t\t\teffort: measured\n\t\t\t\t? \"measured\"\n\t\t\t\t: declaredEfforts === undefined\n\t\t\t\t\t? \"default\"\n\t\t\t\t\t: catalogEfforts !== undefined\n\t\t\t\t\t\t? \"catalog\"\n\t\t\t\t\t\t: \"models.dev\",",
	],
	[
		"\tconst model: NormalizedModel = {\n\t\tproviderId: pack.id,",
		"\tconst routedApi = pack.hooks?.route?.(effective);\n\tconst model: NormalizedModel = {\n\t\tproviderId: pack.id,",
	],
	[
		"\tif (tools !== undefined) model.tools = tools;",
		"\tif (tools !== undefined) model.tools = tools;\n\tif (routedApi !== undefined) model.api = routedApi;",
	],
	[
		"\t\tpriceBlended",
		"",
	],
].filter((pair) => pair[0] !== ""));

// mergeFacts: carry declared efforts through
edit("packages/catalog/src/provenance.ts", [
	[
		"\t\t...(view.priceBlended === undefined ? {} : { priceBlended: view.priceBlended }),\n",
		"",
	],
	[
		"\t\t...(view.thinkingCanDisable === undefined ? {} : { thinkingCanDisable: view.thinkingCanDisable }),",
		"\t\t...(view.thinkingCanDisable === undefined ? {} : { thinkingCanDisable: view.thinkingCanDisable }),\n\t\t...(view.declaredEfforts === undefined ? {} : { efforts: view.declaredEfforts }),",
	],
	[
		"\t\tthinkingCanDisable: firstDefined(catalog.thinkingCanDisable, curated.thinkingCanDisable),",
		"\t\tthinkingCanDisable: firstDefined(catalog.thinkingCanDisable, curated.thinkingCanDisable),\n\t\tefforts: firstDefined(curated.efforts, catalog.efforts),",
	],
]);

// --- catalog: key resolution from files
edit("packages/catalog/src/discover.ts", [
	[
		"import type { HookContext, Pack, RawRecord } from \"@luthfisolahudin/ai-provider-integrations-template-contract\";",
		"import { readFileSync } from \"node:fs\";\nimport { homedir } from \"node:os\";\n\nimport type { HookContext, Pack, RawRecord } from \"@luthfisolahudin/ai-provider-integrations-template-contract\";",
	],
	[
		"/** Resolves the key from the pack's environment, then any explicit override. */\nexport function resolveApiKey(pack: Pack, env: NodeJS.ProcessEnv = process.env): string | undefined {\n\tconst fromEnv = pack.auth?.apiKeyEnv === undefined ? undefined : env[pack.auth.apiKeyEnv];\n\tconst explicit = pack.auth?.apiKey;\n\tconst value = explicit ?? fromEnv;\n\treturn value === undefined || value.trim().length === 0 ? undefined : value.trim();\n}",
		"/**\n * Resolves the key: environment, then the pack's default, then the declared files.\n *\n * The file fallback exists for CLIs that store their own credential (CommandCode\n * does), and it never throws: a missing or malformed file is just a miss.\n */\nexport function resolveApiKey(pack: Pack, env: NodeJS.ProcessEnv = process.env): string | undefined {\n\tconst candidates = [pack.auth?.apiKeyEnv === undefined ? undefined : env[pack.auth.apiKeyEnv], pack.auth?.apiKey];\n\tfor (const candidate of candidates) {\n\t\tif (candidate !== undefined && candidate.trim().length > 0) return candidate.trim();\n\t}\n\tfor (const file of pack.auth?.keyFiles ?? []) {\n\t\tconst key = readKeyFile(file.path, file.keys);\n\t\tif (key !== undefined) return key;\n\t}\n\treturn undefined;\n}\n\nfunction readKeyFile(path: string, keys: readonly string[]): string | undefined {\n\tconst resolved = path.startsWith(\"~\") ? `${homedir()}${path.slice(1)}` : path;\n\ttry {\n\t\tconst body = JSON.parse(readFileSync(resolved, \"utf8\")) as Record<string, unknown>;\n\t\tfor (const key of keys) {\n\t\t\tconst value = body[key];\n\t\t\tif (typeof value === \"string\" && value.trim().length > 0) return value.trim();\n\t\t\tif (Array.isArray(value)) {\n\t\t\t\tconst first = value.find((entry): entry is string => typeof entry === \"string\" && entry.trim().length > 0);\n\t\t\t\tif (first !== undefined) return first.trim();\n\t\t\t}\n\t\t}\n\t} catch {\n\t\t// A missing credential file is a miss, not an error.\n\t}\n\treturn undefined;\n}",
	],
]);

console.log("engine updated");
