export type WireEffort = "max" | "xhigh";

export const MEASURED_WIRE_EFFORT = {
	"cbcn/glm-5.2": "xhigh",
	"cbcn/minimax-m3": "xhigh",
	"cbcn/deepseek-v4-pro": "xhigh",
	"cbcn/deepseek-v4-flash": "xhigh",
	"cbcn/kimi-k3": "xhigh",
	"cx/gpt-5.6-sol": "max",
	"cx/gpt-5.6-terra": "max",
	"cx/gpt-5.6-luna": "max",
	"ag/gemini-3.7-flash-high": "max",
	"ag/claude-sonnet-4-6": "max",
	"ag/claude-opus-4-6-thinking": "max",
	"ag/gpt-oss-120b-medium": "max",
} as const satisfies Record<string, WireEffort>;

/** Returns the measured wire effort, or undefined until the route is probed. */
export function measuredWireEffort(modelId: string): WireEffort | undefined {
	return Object.hasOwn(MEASURED_WIRE_EFFORT, modelId)
		? MEASURED_WIRE_EFFORT[modelId as keyof typeof MEASURED_WIRE_EFFORT]
		: undefined;
}

/**
 * Resolves the measured highest wire effort behind client-facing `max`.
 * @throws When an active reasoning model has not been measured.
 * @see ../docs/EFFORT_MATRIX.md
 */
export function highestWireEffort(modelId: string): WireEffort {
	const effort = measuredWireEffort(modelId);
	if (effort === undefined) {
		throw new Error(`No measured 9Router effort for active reasoning model: ${modelId}`);
	}
	return effort;
}
