import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookContext } from "@luthfisolahudin/ai-integrations-contract";

import { readNineRouterQuota } from "../src/quota.ts";

function makeContext(): HookContext {
	return {
		baseUrl: "http://127.0.0.1:20128/v1",
		apiKey: "sk_9router",
		headers: { Accept: "application/json", Authorization: "Bearer sk_9router" },
		signal: AbortSignal.timeout(5_000),
	};
}

function respond(payload: unknown): typeof globalThis.fetch {
	return async () =>
		new Response(JSON.stringify(payload), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
}

/** The pooled shape the router serves: one account per provider, no email on the label. */
function antigravityAccount() {
	return {
		id: "quota-antigravity",
		label: "Antigravity",
		providerInstanceId: "opencode",
		windows: [
			{ id: "gemini_session", kind: "session", label: "Gemini (5h)", usedPercent: 12, resetsAt: "2026-11-27T07:51:08.000Z" },
			{
				id: "claude_gpt_session",
				kind: "session",
				label: "Claude & GPT (5h)",
				usedPercent: 34,
				resetsAt: "2026-11-27T07:51:09.000Z",
			},
			{ id: "gemini-3.1-flash-image", kind: "other", label: "Gemini 3.1 Flash Image", usedPercent: 0 },
			{ id: "gemini_weekly", kind: "weekly", label: "Gemini (Weekly)", usedPercent: 56, resetsAt: "2026-12-04T02:51:08.000Z" },
			{
				id: "claude_gpt_weekly",
				kind: "weekly",
				label: "Claude & GPT (Weekly)",
				usedPercent: 78,
				resetsAt: "2026-12-04T02:51:09.000Z",
			},
		],
	};
}

test("readNineRouterQuota names the provider as a window suffix and drops the image window", async () => {
	let requestedUrl = "";
	const accounts = await readNineRouterQuota(makeContext(), async (input) => {
		requestedUrl = String(input);
		return new Response(
			JSON.stringify({ version: 1, accounts: [antigravityAccount()] }),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	});

	assert.equal(requestedUrl, "http://127.0.0.1:20128/v1/usage/quota");
	assert.equal(accounts.length, 1);

	const account = accounts[0]!;
	// The router already pools connections, so the account is the product itself.
	assert.equal(account.label, "Antigravity");
	assert.equal(account.id, "quota-antigravity");
	assert.deepEqual(
		account.windows.map((window) => window.label),
		[
			"Gemini Session · Antigravity",
			"Claude & GPT Session · Antigravity",
			"Gemini Weekly · Antigravity",
			"Claude & GPT Weekly · Antigravity",
		],
	);
	assert.ok(
		!account.windows.some((window) => /image/i.test(window.label)),
		"a non-chat image allowance must not become a quota row",
	);
});

test("readNineRouterQuota renames OpenAI Codex and keeps a bare 5h as Session", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({
			version: 1,
			accounts: [
				{
					id: "quota-codex",
					label: "OpenAI Codex (drifts_08heater@icloud.com)",
					windows: [{ id: "5h", kind: "session", label: "5h", usedPercent: 3 }],
				},
			],
		}),
	);

	const account = accounts[0]!;
	assert.equal(account.label, "Codex", "the reseller name is noise, and the email must not survive");
	assert.deepEqual(account.windows.map((window) => window.label), ["Session · Codex"]);
});

test("readNineRouterQuota leaves a monthly window's name alone", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({
			version: 1,
			accounts: [
				{
					id: "quota-codebuddy-cn",
					label: "CodeBuddy CN (Guts Store (1))",
					windows: [{ id: "monthly", kind: "monthly", label: "Monthly", usedPercent: 100 }],
				},
			],
		}),
	);

	assert.equal(accounts[0]!.label, "CodeBuddy CN");
	assert.deepEqual(accounts[0]!.windows.map((window) => window.label), ["Monthly · CodeBuddy CN"]);
});

test("readNineRouterQuota preserves ids, kinds, percentages, resetsAt and order", async () => {
	const source = antigravityAccount();
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({ version: 1, accounts: [source] }),
	);

	const kept = source.windows.filter((window) => !/image/i.test(window.label));
	const windows = accounts[0]!.windows;
	assert.equal(windows.length, kept.length);
	for (const [index, window] of windows.entries()) {
		assert.equal(window.id, kept[index]!.id, "window id is what T3 keys sparse updates on");
		assert.equal(window.kind, kept[index]!.kind);
		assert.equal(window.usedPercent, kept[index]!.usedPercent);
		assert.equal(window.resetsAt, kept[index]!.resetsAt);
	}
});

test("readNineRouterQuota rejects non-2xx responses and malformed payloads", async () => {
	await assert.rejects(
		() => readNineRouterQuota(makeContext(), async () => new Response("nope", { status: 404 })),
		/404/,
	);
	await assert.rejects(
		() =>
			readNineRouterQuota(
				makeContext(),
				async () => new Response(JSON.stringify({ version: 99 }), { status: 200 }),
			),
		/invalid T3 quota response/,
	);
});
