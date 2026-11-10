/** Pi's thinking levels, in ascending order. */
export const PI_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type PiLevel = (typeof PI_LEVELS)[number];

/** Levels that are addressable in `thinkingLevelMap`. */
export const PI_MAPPABLE_LEVELS: readonly PiLevel[] = PI_LEVELS;

export interface EffortMenuInput {
	/** The wire value a probe measured. Absent means "not measured". */
	wireEffort?: string;
	/** `false` when the provider will not run without thinking. */
	canDisable?: boolean;
	/** Levels to expose. Defaults to the highest level only. */
	levels?: readonly PiLevel[];
	/** Extra levels that map to the same wire value, for measured aliases. */
	alias?: readonly PiLevel[];
}

/**
 * Builds Pi's `thinkingLevelMap` from measured evidence.
 *
 * Returns `undefined` when nothing was measured, which is the important case:
 * the model stays visible with no effort menu instead of advertising levels the
 * route may ignore, normalise, or invert. See `docs/THINKING.md`.
 *
 * Client `max` means "the highest effort this route actually applies", so by
 * default only `max` carries the wire value and every other level is `null`.
 */
export function effortMenu(input: EffortMenuInput): Record<PiLevel, string | null> | undefined {
	if (input.wireEffort === undefined || input.wireEffort.trim().length === 0) return undefined;
	const mapped = new Set<PiLevel>(input.levels ?? ["max"]);
	for (const level of input.alias ?? []) mapped.add(level);

	const menu = {} as Record<PiLevel, string | null>;
	for (const level of PI_LEVELS) {
		if (level === "off") {
			menu.off = input.canDisable === false || !mapped.has("off") ? null : "off";
			continue;
		}
		menu[level] = mapped.has(level) ? input.wireEffort : null;
	}
	return menu;
}

/** True when the model offers at least one non-null level. */
export function hasEffortMenu(menu: Record<PiLevel, string | null> | undefined): boolean {
	if (menu === undefined) return false;
	return PI_LEVELS.some((level) => menu[level] !== null);
}
