export const DEFAULT_BASE_URL = "http://127.0.0.1:20128";
export const DEFAULT_API_KEY = "sk_9router";

export interface CatalogCapabilities {
	vision?: unknown;
	pdf?: unknown;
	audioInput?: unknown;
	videoInput?: unknown;
	imageOutput?: unknown;
	audioOutput?: unknown;
	tools?: unknown;
	reasoning?: unknown;
	contextWindow?: unknown;
	maxOutput?: unknown;
	[key: string]: unknown;
}

export interface CatalogRecord {
	id: string;
	name?: unknown;
	display_name?: unknown;
	capabilities?: CatalogCapabilities;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface FetchCatalogOptions {
	baseUrl?: string;
	apiKey?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function catalogCapabilities(record: CatalogRecord): Record<string, unknown> {
	return isRecord(record.capabilities) ? record.capabilities : {};
}

/**
 * Returns a model ID from a validated catalog record.
 * @throws When the record has no usable model ID.
 * @see ./catalog.ts
 */
export function requireStringId(record: Record<string, unknown>): string {
	const id = record.id;
	if (typeof id === "string" && id.trim().length > 0) return id.trim();
	throw new Error("9Router catalog entry is missing a usable id");
}

export const DROPPED_MODEL_IDS = new Set<string>([
	"cbcn/kimi-k3-1",
	"cbcn/deepseek-v4-pro",
	"cbcn/deepseek-v4-flash",
	"cx/codex-auto-review",
]);

/**
 * Validates a 9Router model-list response without changing its membership.
 * @throws When the response is malformed, empty, or contains duplicate IDs.
 * @see ../docs/EFFORT_MATRIX.md
 */
export function parseCatalog(payload: unknown): CatalogRecord[] {
	const entries: unknown[] = [];
	if (Array.isArray(payload)) {
		entries.push(...payload);
	} else if (isRecord(payload)) {
		if (Array.isArray(payload.data)) entries.push(...payload.data);
		else if (Array.isArray(payload.models)) entries.push(...payload.models);
		else if (typeof payload.id === "string") entries.push(payload);
	}
	if (entries.length === 0) {
		throw new Error("9Router returned an invalid model catalog (no model records)");
	}

	const seen = new Set<string>();
	const records: CatalogRecord[] = [];
	for (const entry of entries) {
		if (!isRecord(entry)) throw new Error("9Router catalog contains a non-object model record");
		const id = requireStringId(entry);
		if (seen.has(id)) throw new Error(`9Router catalog contains duplicate model id: ${id}`);
		seen.add(id);
		if (DROPPED_MODEL_IDS.has(id)) continue;
		records.push({ ...entry, id } as CatalogRecord);
	}
	return records;
}

// Brand and owner casing is not derivable from slugs, so both are curated.
export const KNOWN_BRANDS: Record<string, string> = {
	deepseek: "DeepSeek",
	gemini: "Gemini",
	glm: "GLM",
	gpt: "GPT",
	kimi: "Kimi",
	minimax: "MiniMax",
	oss: "OSS",
};
const KNOWN_OWNERS: Record<string, string> = {
	ag: "Antigravity",
	cbcn: "CodeBuddy CN",
	cx: "OpenAI Codex",
};
// Full-id overrides for labels the slug alone cannot render.
export const KNOWN_MODEL_NAMES: Record<string, string> = {
	"ag/claude-opus-4-6-thinking": "Claude Opus 4.6",
	"ag/claude-sonnet-4-6": "Claude Sonnet 4.6",
	"ag/gemini-3.8-flash-high": "Gemini 3.8 Flash",
	"ag/gpt-oss-120b-medium": "GPT OSS 120B",
};

function prettifySlugToken(token: string): string {
	if (token.length === 0) return token;
	const brand = KNOWN_BRANDS[token.toLowerCase()];
	if (brand !== undefined) return brand;
	// Version tokens carry their own casing: v4, 5.2.
	if (/^v?\d/i.test(token)) return token.toUpperCase();
	return token.charAt(0).toUpperCase() + token.slice(1);
}

/**
 * Renders a catalog model ID for pickers: `cbcn/kimi-k3` -> `Kimi K3 (CodeBuddy CN)`.
 * Degrades to the raw id when no owner/slug is present, so malformed or partial
 * ids never render empty or whitespace-only picker labels like `" ()"`.
 * @see ../README.md
 */
export function displayName(id: string): string {
	const slash = id.indexOf("/");
	const owner = slash === -1 ? "" : id.slice(0, slash).trim();
	const slug = (slash === -1 ? id : id.slice(slash + 1)).trim();
	if (slug.length === 0) return id;
	// Empty tokens from repeated separators (`kimi--k3`, `-k3`, `k3-`) are
	// dropped so the label can never collapse into whitespace.
	const pretty = KNOWN_MODEL_NAMES[id] ?? slug.split("-").filter((token) => token.length > 0).map(prettifySlugToken).join(" ");
	if (pretty.length === 0) return id;
	if (owner.length === 0) return pretty;
	return `${pretty} (${KNOWN_OWNERS[owner] ?? owner})`;
}

function combinedSignal(external: AbortSignal | undefined, timeoutMs: number | undefined): AbortSignal | undefined {
	if (external !== undefined) {
		return timeoutMs === undefined ? external : AbortSignal.any([external, AbortSignal.timeout(timeoutMs)]);
	}
	return timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs);
}

export function resolveBaseUrl(value?: string): string {
	const resolved = (value ?? process.env.NINE_ROUTER_BASE_URL ?? DEFAULT_BASE_URL)
		.trim()
		.replace(/\/+$/, "");
	if (resolved.length === 0) {
		throw new Error(
			"9Router base URL is empty after trimming; set NINE_ROUTER_BASE_URL or pass baseUrl explicitly",
		);
	}
	return resolved.replace(/\/v1$/i, "");
}

/** Resolves 9Router's OpenAI-compatible API root. @see ../README.md */
export function resolveApiBaseUrl(value?: string): string {
	return `${resolveBaseUrl(value)}/v1`;
}

export function resolveApiKey(value?: string): string {
	const resolved = value ?? process.env.NINE_ROUTER_API_KEY ?? DEFAULT_API_KEY;
	if (resolved.trim().length === 0) {
		throw new Error("9Router API key is empty; set NINE_ROUTER_API_KEY or pass apiKey explicitly");
	}
	return resolved;
}

/**
 * Fetches the exact active 9Router catalog.
 * @throws When discovery fails or the response is invalid.
 * @see ../docs/EFFORT_MATRIX.md
 */
export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<CatalogRecord[]> {
	const baseUrl = resolveApiBaseUrl(options.baseUrl);
	const apiKey = resolveApiKey(options.apiKey);
	let response: Response;
	try {
		response = await fetch(`${baseUrl}/models`, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: combinedSignal(options.signal, options.timeoutMs ?? 5_000),
		});
	} catch (error) {
		if (options.signal?.aborted) throw new Error("9Router model discovery was aborted");
		throw new Error(`9Router model discovery request failed: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (!response.ok) throw new Error(`9Router model discovery failed (HTTP ${response.status})`);
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new Error("9Router model discovery returned invalid JSON");
	}
	return parseCatalog(payload);
}
