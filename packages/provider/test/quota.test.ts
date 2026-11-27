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

function antigravityAccount(id: string, email: string) {
	return {
		id,
		label: `Antigravity (${email})`,
		providerInstanceId: "opencode",
		windows: [
			{
				id: "gemini_session",
				kind: "session",
				label: "Gemini (5h)",
				usedPercent: 12,
				resetsAt: "2026-11-27T07:51:08.000Z",
			},
			{
				id: "claude_gpt_session",
				kind: "session",
				label: "Claude & GPT (5h)",
				usedPercent: 34,
				resetsAt: "2026-11-27T07:51:09.000Z",
			},
			{
				id: "gemini-3.1-flash-image",
				kind: "other",
				label: "Gemini 3.1 Flash Image",
				usedPercent: 0,
				resetsAt: "2026-11-27T07:53:47.000Z",
			},
			{
				id: "gemini_weekly",
				kind: "weekly",
				label: "Gemini (Weekly)",
				usedPercent: 56,
				resetsAt: "2026-12-04T02:51:08.000Z",
			},
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

test("readNineRouterQuota reads /v1/usage/quota with router auth headers", async () => {
	let requestedUrl = "";
	const accounts = await readNineRouterQuota(makeContext(), async (input) => {
		requestedUrl = String(input);
		return new Response(
			JSON.stringify({
				version: 1,
				accounts: [
					{
						id: "9router-codex-1",
						label: "OpenAI Codex (plus)",
						providerInstanceId: "opencode",
						windows: [
							{
								id: "5h",
								kind: "session",
								label: "5h",
								usedPercent: 30,
								resetsAt: "2026-12-17T03:00:38.000Z",
							},
						],
					},
				],
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	});

	assert.equal(requestedUrl, "http://127.0.0.1:20128/v1/usage/quota");
	assert.equal(accounts.length, 1);
	// 9Router's account label is what T3 shows on the Usage page; it must stay verbatim.
	assert.equal(accounts[0]!.label, "OpenAI Codex (plus)");
	assert.deepEqual(accounts[0]!.windows, [
		{
			id: "5h",
			kind: "session",
			label: "Session · Codex",
			usedPercent: 30,
			resetsAt: "2026-12-17T03:00:38.000Z",
		},
	]);
});

test("readNineRouterQuota renames Codex even when the account label has no parenthetical", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({
			version: 1,
			accounts: [
				{
					id: "9router-codex-1",
					label: "OpenAI Codex",
					windows: [{ id: "5h", kind: "session", label: "5h", usedPercent: 30 }],
				},
			],
		}),
	);

	assert.equal(accounts[0]!.label, "OpenAI Codex");
	assert.equal(accounts[0]!.windows[0]!.label, "Session · Codex");
});

test("readNineRouterQuota keeps the account label and a monthly window name for a unique provider", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({
			version: 1,
			accounts: [
				{
					id: "9router-codebuddy-cn-1",
					label: "CodeBuddy CN (Guts Store (1))",
					windows: [{ id: "monthly", kind: "monthly", label: "Monthly", usedPercent: 100 }],
				},
			],
		}),
	);

	assert.equal(accounts[0]!.label, "CodeBuddy CN (Guts Store (1))");
	assert.equal(accounts[0]!.windows[0]!.label, "Monthly · CodeBuddy CN");
	assert.equal(accounts[0]!.windows[0]!.id, "monthly");
});

test("readNineRouterQuota drops non-chat windows and rewrites the four Antigravity periods", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({ version: 1, accounts: [antigravityAccount("9router-antigravity-1", "solo@example.com")] }),
	);

	assert.equal(accounts[0]!.label, "Antigravity (solo@example.com)");
	assert.equal(accounts[0]!.windows.length, 4);
	assert.deepEqual(accounts[0]!.windows.map((window) => window.label), [
		"Gemini Session · Antigravity",
		"Claude & GPT Session · Antigravity",
		"Gemini Weekly · Antigravity",
		"Claude & GPT Weekly · Antigravity",
	]);
	assert.ok(accounts[0]!.windows.every((window) => !/image/i.test(window.label)));
});

test("readNineRouterQuota disambiguates same-named accounts in the window label only", async () => {
	const accounts = await readNineRouterQuota(
		makeContext(),
		respond({
			version: 1,
			accounts: [
				antigravityAccount("9router-antigravity-1", "dallasscorpio67@gmail.com"),
				antigravityAccount("9router-antigravity-2", "dadangw5768@gmail.com"),
				antigravityAccount("9router-antigravity-3", "dadanggg348@gmail.com"),
			],
		}),
	);

	assert.deepEqual(accounts.map((account) => account.label), [
		"Antigravity (dallasscorpio67@gmail.com)",
		"Antigravity (dadangw5768@gmail.com)",
		"Antigravity (dadanggg348@gmail.com)",
	]);
	assert.deepEqual(accounts.map((account) => account.windows[0]!.label), [
		"Gemini Session · Antigravity (dallasscorpio67)",
		"Gemini Session · Antigravity (dadangw5768)",
		"Gemini Session · Antigravity (dadanggg348)",
	]);
	assert.equal(new Set(accounts.flatMap((account) => account.windows.map((window) => window.label))).size, 12);
});

test("readNineRouterQuota preserves window ids, kinds, percentages, resetsAt and order", async () => {
	const payload = {
		version: 1,
		accounts: [antigravityAccount("9router-antigravity-1", "solo@example.com")],
	};
	const accounts = await readNineRouterQuota(makeContext(), respond(payload));
	const source = payload.accounts[0]!.windows.filter(
		(window) => !/image|embed|embedding|rerank/i.test(window.label),
	);

	assert.deepEqual(
		accounts[0]!.windows.map(({ id, kind, usedPercent, resetsAt }) => ({ id, kind, usedPercent, resetsAt })),
		source.map(({ id, kind, usedPercent, resetsAt }) => ({ id, kind, usedPercent, resetsAt })),
	);
	assert.equal(accounts[0]!.id, "9router-antigravity-1");
	assert.equal(accounts[0]!.providerInstanceId, "opencode");
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
