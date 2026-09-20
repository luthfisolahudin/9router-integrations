import type { CatalogRecord } from "../src/catalog.ts";

/**
 * Stubs `globalThis.fetch` with `handler` and restores the original when the
 * returned function runs. Use inside try/finally:
 *
 * ```ts
 * const restore = mockFetch(async () => new Response("..."));
 * try { /* ... *\/ } finally { restore(); }
 * ```
 */
export function mockFetch(handler: typeof globalThis.fetch): () => void {
	const original = globalThis.fetch;
	globalThis.fetch = handler;
	return () => {
		globalThis.fetch = original;
	};
}

/** Wraps records in an OpenAI-style `{ data: [...] }` catalog payload. */
export function catalogFixture(...records: CatalogRecord[]): string {
	return JSON.stringify({ data: records });
}
