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
} as const satisfies Record<string, WireEffort>;

/**
 * Resolves the measured highest wire effort behind client-facing `max`.
 * @throws When an active reasoning model has not been measured.
 * @see ../docs/EFFORT_MATRIX.md
 */
export function highestWireEffort(modelId: string): WireEffort {
	if (!Object.hasOwn(MEASURED_WIRE_EFFORT, modelId)) {
		throw new Error(`No measured 9Router effort for active reasoning model: ${modelId}`);
	}
	return MEASURED_WIRE_EFFORT[modelId as keyof typeof MEASURED_WIRE_EFFORT];
}
