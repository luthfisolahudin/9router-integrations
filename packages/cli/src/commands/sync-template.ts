#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Lock {
	template: string;
	version: string;
	commit?: string;
	packSchemaVersion: number;
	identity: { name: string; description: string };
	owned: string[];
	deleted: string[];
}

const ROOT = process.cwd();
const LOCK_PATH = join(ROOT, "template.lock.json");
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--yes");
const version = argument("version");

function argument(name: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	if (index < 0) return undefined;
	const value = process.argv[index + 1];
	return value === undefined || value.startsWith("--") ? undefined : value;
}

function git(args: string[]): string {
	return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function inMerge(): boolean {
	return existsSync(join(ROOT, ".git", "MERGE_HEAD"));
}

if (!existsSync(LOCK_PATH)) {
	console.error("template.lock.json not found: this checkout is the template, not a downstream repo.");
	console.error("Downstream repos record the template version there; see docs/SYNC.md.");
	process.exit(2);
}

const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Lock;
console.log(`template: ${lock.template}@${lock.version}`);
console.log(`identity: ${lock.identity.name}`);
console.log(`owned paths (never take the template's side): ${lock.owned.join(", ") || "(none)"}`);
console.log(`deleted paths (never resurrect): ${lock.deleted.join(", ") || "(none)"}`);

const dirty = git(["status", "--porcelain"]);
if (dirty.length > 0) {
	console.error("\nworking tree is not clean; commit or stash before syncing:");
	console.error(dirty);
	process.exit(2);
}

if (!apply) {
	console.log("\nDry run. Re-run with `--apply --yes --version <tag>` to merge a template tag.");
	process.exit(0);
}

if (version === undefined) {
	console.error("--apply requires --version <tag>");
	process.exit(2);
}
if (!confirmed) {
	console.error("--apply rewrites the working tree; pass --yes to confirm.");
	process.exit(2);
}

console.log(`\nfetching template tags...`);
git(["fetch", "template", "--tags", "--force"]);

// Resolve the tag to a commit explicitly. `template@v1.2.3` is not a git
// refspec, and a silent failure there used to bump the lock without merging.
let target: string;
try {
	target = git(["rev-parse", "--verify", `refs/tags/${version}^{commit}`]);
} catch {
	console.error(`tag ${version} is not present after fetching; nothing merged.`);
	process.exit(2);
}
console.log(`merging ${version} (${target.slice(0, 12)})...`);

try {
	execFileSync("git", ["merge", "--no-commit", target], { cwd: ROOT, stdio: "inherit" });
} catch {
	if (!inMerge()) {
		console.error("git merge failed before it could start; nothing merged, nothing committed.");
		process.exit(2);
	}
	// A conflict is expected; resolution below is deterministic for owned paths.
}

const conflicts = git(["diff", "--name-only", "--diff-filter=U"])
	.split("\n")
	.filter((line) => line.length > 0);

for (const path of conflicts) {
	if (lock.owned.some((pattern) => matches(pattern, path))) {
		git(["checkout", "HEAD", "--", path]);
		git(["add", "--", path]);
		console.log(`kept ours: ${path}`);
		continue;
	}
	if (lock.deleted.some((pattern) => matches(pattern, path))) {
		git(["rm", "-f", "--", path]);
		console.log(`kept deletion: ${path}`);
		continue;
	}
	console.error(`unresolved engine conflict: ${path}`);
}

const remaining = git(["diff", "--name-only", "--diff-filter=U"]).split("\n").filter((line) => line.length > 0);
if (remaining.length > 0) {
	console.error(`\n${remaining.length} conflict(s) need a human decision. Nothing was committed.`);
	process.exit(2);
}

const staged = git(["diff", "--cached", "--name-only"]).split("\n").filter((line) => line.length > 0);
console.log(`\n${staged.length} path(s) changed by the merge`);

console.log("\nrunning `pnpm check` before committing...");
// A shell resolves the pnpm shim on every platform; execFile does not find the
// Windows .cmd wrapper. The command is a literal, so no input is interpolated.
execSync("pnpm check", { cwd: ROOT, stdio: "inherit" });

writeFileSync(LOCK_PATH, `${JSON.stringify({ ...lock, version, commit: target }, null, 2)}\n`);
git(["add", "template.lock.json"]);
execFileSync(
	"git",
	[
		"commit",
		"-m",
		`Sync template ${lock.template}@${version}`,
		"-m",
		`Template-Source: ${lock.template}@${version}`,
		"-m",
		`Merged ${target.slice(0, 12)}; ${staged.length} path(s) changed by the template.`,
	],
	{ cwd: ROOT, stdio: "inherit" },
);
console.log(`\nsynced to ${version}.`);

function matches(pattern: string, path: string): boolean {
	if (!pattern.includes("*")) return pattern === path;
	const regex = new RegExp(`^${pattern.split("**").map(escapeRegExp).join(".*").replace(/\/\*$/, "(/.*)?")}$`);
	return regex.test(path);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
}
