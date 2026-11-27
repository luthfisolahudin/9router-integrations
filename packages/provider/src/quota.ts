import {
	quotaWindowLabel,
	type HookContext,
	type HttpQuotaAccount,
	type HttpQuotaResponse,
} from "@luthfisolahudin/ai-integrations-contract";

/** 9Router names each upstream after the vendor it resells, which reads as noise in a quota row. */
const PROVIDER_NAMES: Readonly<Record<string, string>> = {
	"OpenAI Codex": "Codex",
};

/** An image allowance is not a chat quota, and 9Router does not route chat to it. */
const NON_CHAT_WINDOW = /image|embed|embedding|rerank/i;

const SESSION_SUFFIX = / \((?:5h|5H)\)$/;
const WEEKLY_SUFFIX = / \(Weekly\)$/;

/**
 * The router already pools every connection of one provider into a single account
 * (see its `t3Quota.js`), so the label is just the product name: no email, and no
 * per-account discriminator to keep apart.
 */
function providerName(label: string): string {
	const start = label.endsWith(")") ? label.indexOf(" (") : -1;
	const name = start === -1 ? label : label.slice(0, start);
	return PROVIDER_NAMES[name] ?? name;
}

/** 9Router names windows for humans ("Gemini (5h)"); T3 expects quota periods. */
function windowName(label: string): string {
	if (/^5h$/i.test(label)) return "Session";
	if (SESSION_SUFFIX.test(label)) return label.replace(SESSION_SUFFIX, " Session");
	if (WEEKLY_SUFFIX.test(label)) return label.replace(WEEKLY_SUFFIX, " Weekly");
	return label;
}

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

	return body.accounts.map((account) => {
		const provider = providerName(account.label);
		return {
			...account,
			label: provider,
			windows: account.windows
				.filter((window) => !NON_CHAT_WINDOW.test(window.label))
				.map((window) => ({
					...window,
					label: quotaWindowLabel(windowName(window.label), provider),
				})),
		};
	});
}
