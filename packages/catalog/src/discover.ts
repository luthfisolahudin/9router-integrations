import type { HookContext, Pack, RawRecord } from "@luthfisolahudin/9router-integrations-contract";

import { parseEnvelope } from "./parse.ts";

export type FetchLike = typeof globalThis.fetch;

export interface DiscoverOptions {
	fetch?: FetchLike;
	signal?: AbortSignal;
	apiKey?: string;
	etag?: string;
	now?: () => number;
}

export interface DiscoverResult {
	raw: RawRecord[];
	etag?: string;
	notModified: boolean;
	checkedAt: number;
	status: number;
}

export const DEFAULT_TIMEOUT_MS = 5_000;

/** Resolves the key from the pack's environment, then any explicit override. */
export function resolveApiKey(pack: Pack, env: NodeJS.ProcessEnv = process.env): string | undefined {
	const fromEnv = pack.auth?.apiKeyEnv === undefined ? undefined : env[pack.auth.apiKeyEnv];
	const explicit = pack.auth?.apiKey;
	const value = explicit ?? fromEnv;
	return value === undefined || value.trim().length === 0 ? undefined : value.trim();
}

export function authHeaders(pack: Pack, apiKey: string | undefined): Record<string, string> {
	if (pack.auth?.kind === "none" || apiKey === undefined) return {};
	return { Authorization: `Bearer ${apiKey}` };
}

function headersFor(pack: Pack, apiKey: string | undefined): Record<string, string> {
	return {
		Accept: "application/json",
		"User-Agent": pack.discovery.userAgent ?? "ai-provider-integrations/0.1",
		...authHeaders(pack, apiKey),
		...pack.discovery.headers,
	};
}

/**
 * Fetches the provider catalog.
 *
 * A bespoke envelope goes through `pack.hooks.discover`; everything else uses
 * `discovery.path` and the strict parser. `304` is reported as `notModified` so
 * callers keep the snapshot they already trust.
 */
export async function discover(pack: Pack, options: DiscoverOptions = {}): Promise<DiscoverResult> {
	const now = options.now ?? Date.now;
	const apiKey = options.apiKey ?? resolveApiKey(pack);
	const headers = headersFor(pack, apiKey);
	if (options.etag !== undefined) headers["If-None-Match"] = options.etag;

	const timeout = AbortSignal.timeout(pack.discovery.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = options.signal === undefined ? timeout : AbortSignal.any([timeout, options.signal]);

	if (pack.hooks?.discover !== undefined) {
		const context: HookContext = {
			baseUrl: pack.baseUrl.replace(/\/+$/, ""),
			...(apiKey === undefined ? {} : { apiKey }),
			headers,
			signal,
		};
		const raw = await pack.hooks.discover(context);
		if (raw.length === 0) throw new Error(`pack "${pack.id}": discover hook returned no models`);
		return { raw, notModified: false, checkedAt: now(), status: 200 };
	}

	const response = await (options.fetch ?? globalThis.fetch)(
		`${pack.baseUrl.replace(/\/+$/, "")}${pack.discovery.path}`,
		{ headers, signal },
	);
	if (response.status === 304) {
		return { raw: [], notModified: true, checkedAt: now(), status: 304 };
	}
	if (!response.ok) {
		throw new Error(`model discovery failed (HTTP ${response.status}) for ${pack.id}`);
	}
	const payload: unknown = await response.json();
	const etag = response.headers.get("etag");
	return {
		raw: parseEnvelope(payload),
		...(etag === null ? {} : { etag }),
		notModified: false,
		checkedAt: now(),
		status: response.status,
	};
}
