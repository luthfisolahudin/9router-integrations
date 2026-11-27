import type { HookContext, HttpQuotaAccount, HttpQuotaResponse } from "@luthfisolahudin/ai-integrations-contract";

/** 9Router names each upstream after the vendor it resells, which reads as noise in a quota row. */
const PROVIDER_NAMES: Readonly<Record<string, string>> = {
	"OpenAI Codex": "Codex",
};

const NON_CHAT_WINDOW = /image|embed|embedding|rerank/i;
const SESSION_SUFFIX = / \((?:5h|5H)\)$/;
const WEEKLY_SUFFIX = / \(Weekly\)$/;

/**
 * T3's Limits row renders only `window.label`, so provider and period share it;
 * the account label is shown alone on the Usage page and keeps its email.
 */
function providerName(label: string): string {
	const start = label.endsWith(")") ? label.indexOf(" (") : -1;
	const name = start === -1 ? label : label.slice(0, start);
	return PROVIDER_NAMES[name] ?? name;
}

/** The stripped parenthetical, kept only to tell same-named accounts apart. */
function accountDetail(label: string): string | undefined {
	if (!label.endsWith(")")) return undefined;
	const start = label.indexOf(" (");
	return start === -1 ? undefined : label.slice(start + 2, -1);
}

function discriminator(detail: string | undefined): string | undefined {
	const local = detail?.split("@")[0];
	const short = local?.slice(0, 24);
	return short ? short : undefined;
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

	const mapped = body.accounts.map((account) => ({
		account,
		provider: providerName(account.label),
		detail: accountDetail(account.label),
		windows: account.windows
			.filter((window) => !NON_CHAT_WINDOW.test(window.label))
			.map((window) => ({ ...window, name: windowName(window.label) })),
	}));

	const occurrences = new Map<string, number>();
	for (const { provider } of mapped) {
		occurrences.set(provider, (occurrences.get(provider) ?? 0) + 1);
	}

	return mapped.map(({ account, provider, detail, windows }) => {
		const short = (occurrences.get(provider) ?? 0) > 1 ? discriminator(detail) : undefined;
		const source = short === undefined ? provider : `${provider} (${short})`;
		return {
			...account,
			windows: windows.map(({ name, ...window }) => ({ ...window, label: `${name} · ${source}` })),
		};
	});
}
