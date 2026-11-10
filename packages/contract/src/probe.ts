import { PI_LEVELS, type PiLevel } from "./effort.ts";

/** One request's observation. Tokens and chars are both accepted as signals. */
export interface ProbeSample {
	level: string;
	status: number;
	finishReason?: string;
	reasoningTokens?: number;
	/** Length of `reasoning_content` when the provider does not report tokens. */
	reasoningChars?: number;
}

export interface EffortEvidence {
	/** Median signal per level, for the evidence log. */
	readonly signals: Record<string, number>;
	readonly noiseFloor: number;
}

export type EffortVerdict =
	| { verdict: "unsupported"; levels: string[] }
	| ({ verdict: "no-observable-difference"; levels: string[] } & EffortEvidence)
	| ({ verdict: "mapped"; level: string; wire: string } & EffortEvidence)
	| ({ verdict: "inverted"; level: string; wire: string } & EffortEvidence);

export interface DecideOptions {
	/**
	 * Absolute token difference treated as noise. Defaults to `max(2, 10%)` of the
	 * largest observed signal: reasoning-token counts move by a few tokens on
	 * unrelated request noise, so an unbounded comparison would "find" a mapping
	 * in a 10-vs-11 sample.
	 */
	noiseFloor?: number;
}

export function median(values: readonly number[]): number | undefined {
	if (values.length === 0) return undefined;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[middle];
	const lower = sorted[middle - 1] ?? 0;
	return (lower + sorted[middle]!) / 2;
}

function signalOf(sample: ProbeSample): number | undefined {
	if (sample.reasoningTokens !== undefined) return sample.reasoningTokens;
	return sample.reasoningChars;
}

function levelOrder(level: string): number {
	const index = PI_LEVELS.indexOf(level as PiLevel);
	return index === -1 ? PI_LEVELS.length : index;
}

/**
 * Turns probe samples into an evidence-backed verdict.
 *
 * The rule that matters: identical signals mean *no observable difference*, so
 * the model ships without an effort menu. Picking a winner from noise is how a
 * picker ends up advertising a level the route ignores.
 */
export function decideEffort(samples: readonly ProbeSample[], options: DecideOptions = {}): EffortVerdict {
	const accepted = samples.filter((sample) => sample.status === 200);
	const levels = [...new Set(samples.map((sample) => sample.level))].sort(
		(a, b) => levelOrder(a) - levelOrder(b) || a.localeCompare(b),
	);
	if (accepted.length === 0) return { verdict: "unsupported", levels };

	const signals: Record<string, number> = {};
	for (const level of levels) {
		const values = accepted
			.filter((sample) => sample.level === level)
			.map(signalOf)
			.filter((value): value is number => value !== undefined);
		const medianValue = median(values);
		if (medianValue !== undefined) signals[level] = medianValue;
	}
	const observed = Object.values(signals);
	const max = observed.length === 0 ? 0 : Math.max(...observed);
	const noiseFloor = options.noiseFloor ?? Math.max(2, Math.round(max * 0.1));
	const min = observed.length === 0 ? 0 : Math.min(...observed);

	if (observed.length === 0 || max - min <= noiseFloor) {
		return { verdict: "no-observable-difference", levels, signals, noiseFloor };
	}

	const best = observed.includes(max)
		? levels
				.filter((level) => signals[level] === max)
				.sort((a, b) => levelOrder(b) - levelOrder(a))[0]
		: undefined;
	const highest = levels[levels.length - 1];
	if (best === undefined || highest === undefined) {
		return { verdict: "no-observable-difference", levels, signals, noiseFloor };
	}
	return {
		verdict: best === highest ? "mapped" : "inverted",
		level: best,
		wire: best,
		signals,
		noiseFloor,
	};
}
