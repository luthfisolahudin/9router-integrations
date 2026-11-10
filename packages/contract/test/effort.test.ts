import assert from "node:assert/strict";
import { test } from "node:test";

import { effortMenu, hasEffortMenu } from "../src/index.ts";

test("no measurement means no menu", () => {
	assert.equal(effortMenu({}), undefined);
	assert.equal(effortMenu({ wireEffort: "  " }), undefined);
	assert.equal(hasEffortMenu(undefined), false);
});

test("client max carries the measured wire value and other levels are hidden", () => {
	const menu = effortMenu({ wireEffort: "xhigh" });
	assert.deepEqual(menu, {
		off: null,
		minimal: null,
		low: null,
		medium: null,
		high: null,
		xhigh: null,
		max: "xhigh",
	});
	assert.equal(hasEffortMenu(menu), true);
});

test("a non-disableable model also hides off", () => {
	const menu = effortMenu({ wireEffort: "max", canDisable: false });
	assert.equal(menu?.off, null);
	assert.equal(menu?.max, "max");
});

test("measured aliases can be exposed explicitly", () => {
	const menu = effortMenu({ wireEffort: "high", levels: ["high", "max"] });
	assert.equal(menu?.high, "high");
	assert.equal(menu?.max, "high");
});
