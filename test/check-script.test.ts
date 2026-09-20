import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { after, before, describe } from "node:test";
import test from "node:test";
import { createServer, type Server } from "node:http";

import { catalogFixture } from "./helpers.ts";

const SCRIPT_PATH = new URL("../scripts/check-catalog.ts", import.meta.url).pathname;

const FIXTURE_CATALOG = catalogFixture(
	{ id: "cbcn/deepseek-v4.1-flash", capabilities: { vision: true, reasoning: true, tools: true } },
	{ id: "cx/gpt-5.6-terra", capabilities: { vision: true, reasoning: true } },
	{ id: "cx/gpt-5.5", capabilities: { reasoning: true } },
	{ id: "ag/gpt-oss-120b-medium", capabilities: { vision: false, reasoning: true } },
	// A new reasoning model the effort table has not measured yet.
	{ id: "cbcn/future-reasoner", capabilities: { vision: true, reasoning: true } },
);

describe("check-catalog script end-to-end", () => {
	let server: Server;
	let baseUrl = "";

	before(async () => {
		server = createServer((_request, response) => {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(FIXTURE_CATALOG);
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
	});

	after(() => new Promise<void>((resolve) => server.close(() => resolve())));

	function runScript(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
				env: { ...process.env, NINE_ROUTER_BASE_URL: baseUrl },
			});
			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk) => (stdout += chunk));
			child.stderr.on("data", (chunk) => (stderr += chunk));
			child.on("error", reject);
			child.on("close", (code) => resolve({ code, stdout, stderr }));
		});
	}

	test("exits 0 with the exact success line when both leniency flags pass", async () => {
		const { code, stdout, stderr } = await runScript(["--allow-stale", "--allow-unmeasured"]);
		assert.equal(code, 0, stderr);
		assert.equal(stdout, "9Router catalog OK: 5 model(s) projected for OpenCode and Pi; capability invariants hold.\n");
		// Stale rows stay an informational stderr note even when tolerated.
		assert.match(stderr, /measured efforts for models absent/);
	});

	test("exits 1 with stale-effort guidance when measured rows are absent from the catalog", async () => {
		// The fixture serves 4 of the 14 measured models: the other rows are
		// stale evidence and must fail the run without --allow-stale.
		const { code, stderr } = await runScript([]);
		assert.equal(code, 1);
		assert.match(stderr, /measured efforts for models absent/);
		assert.match(stderr, /Remove each entry/);
	});

	test("exits 1 with probe guidance when a reasoning model is unmeasured", async () => {
		const { code, stderr } = await runScript(["--allow-stale"]);
		assert.equal(code, 1, "an unmeasured reasoning model must fail without --allow-unmeasured");
		assert.match(stderr, /reasoning models without measured wire effort/);
		assert.match(stderr, /- cbcn\/future-reasoner/);
		assert.match(stderr, /Probe the route/);
	});
});
