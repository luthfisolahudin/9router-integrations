export interface ModelLimits {
	contextWindow?: number;
	maxOutput?: number;
}

export interface LimitIndex {
	readonly size: number;
	get(modelId: string): ModelLimits | undefined;
}

function positive(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

/**
 * Normalises an id for cross-catalog comparison: lower-case, without a
 * `:free`-style tag or an `-YYYYMMDD` suffix, so `vendor/model` and `model`
 * land in one bucket.
 */
export function normalizeModelKey(id: string): string {
	return id
		.trim()
		.toLowerCase()
		.replace(/:[a-z0-9._-]+$/u, "")
		.replace(/-\d{8}$/u, "");
}

/** Last path segment of a normalised id. */
export function modelKey(id: string): string {
	const segments = normalizeModelKey(id).split("/");
	return segments[segments.length - 1] ?? "";
}

function majority(values: readonly (number | undefined)[]): number | undefined {
	const votes = new Map<number, number>();
	for (const value of values) {
		if (value === undefined) continue;
		votes.set(value, (votes.get(value) ?? 0) + 1);
	}
	let winner: number | undefined;
	for (const [value, count] of votes) {
		if (winner === undefined) {
			winner = value;
			continue;
		}
		const winnerCount = votes.get(winner) ?? 0;
		if (count > winnerCount || (count === winnerCount && value > winner)) winner = value;
	}
	return winner;
}

/**
 * Builds a limit lookup from a models.dev-shaped document.
 *
 * Catalogs list the same model once per gateway and gateways clip windows, so
 * the **majority** value wins rather than the first one seen: an under-reported
 * window makes a host compact too early. Ties go to the larger value. Output
 * caps are only counted for the chosen window, so a bigger window's cap cannot
 * leak through.
 */
export function buildLimitIndex(catalog: unknown): LimitIndex {
	const candidates = new Map<string, ModelLimits[]>();
	if (typeof catalog !== "object" || catalog === null) {
		return { size: 0, get: () => undefined };
	}
	for (const provider of Object.values(catalog as Record<string, unknown>)) {
		const models = (provider as { models?: Record<string, unknown> } | null)?.models;
		if (typeof models !== "object" || models === null) continue;
		for (const [id, entry] of Object.entries(models)) {
			const limit = (entry as { limit?: { context?: unknown; output?: unknown } } | null)?.limit;
			const contextWindow = positive(limit?.context);
			const maxOutput = positive(limit?.output);
			if (contextWindow === undefined && maxOutput === undefined) continue;
			const key = modelKey(id);
			if (key.length === 0) continue;
			const bucket = candidates.get(key);
			if (bucket === undefined) candidates.set(key, [{ contextWindow, maxOutput }]);
			else bucket.push({ contextWindow, maxOutput });
		}
	}

	const index = new Map<string, ModelLimits>();
	for (const [key, entries] of candidates) {
		const contextWindow = majority(entries.map((entry) => entry.contextWindow));
		if (contextWindow === undefined) {
			index.set(key, { maxOutput: majority(entries.map((entry) => entry.maxOutput)) });
			continue;
		}
		const maxOutput = majority(
			entries.filter((entry) => entry.contextWindow === contextWindow).map((entry) => entry.maxOutput),
		);
		index.set(key, { contextWindow, maxOutput });
	}

	return {
		size: index.size,
		get(modelId: string): ModelLimits | undefined {
			return index.get(modelKey(modelId));
		},
	};
}
