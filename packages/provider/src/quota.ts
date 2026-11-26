import type { HookContext, HttpQuotaAccount, HttpQuotaResponse } from "@luthfisolahudin/ai-integrations-contract";

export async function readNineRouterQuota(
	context: HookContext,
	fetchImpl: typeof globalThis.fetch = globalThis.fetch,
): Promise<HttpQuotaAccount[]> {
	const url = `${context.baseUrl.replace(/\/+$/, "")}/usage/quota`;
	const response = await fetchImpl(url, {
		headers: context.headers,
		signal: context.signal,
	});
	if (!response.ok) {
		throw new Error(`9Router quota request failed (${url} returned HTTP ${response.status})`);
	}
	const body = (await response.json()) as Partial<HttpQuotaResponse>;
	if (body.version !== 1 || !Array.isArray(body.accounts)) {
		throw new Error("9Router returned an invalid T3 quota response");
	}
	return body.accounts;
}
