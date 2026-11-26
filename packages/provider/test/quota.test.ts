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
						windows: [{ id: "5h", kind: "session", label: "5h", usedPercent: 30 }],
					},
				],
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	});

	assert.equal(requestedUrl, "http://127.0.0.1:20128/v1/usage/quota");
	assert.equal(accounts.length, 1);
	assert.equal(accounts[0]!.label, "OpenAI Codex (plus)");
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
