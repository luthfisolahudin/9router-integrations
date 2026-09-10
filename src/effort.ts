export type WireEffort = "max" | "xhigh";

export const MEASURED_WIRE_EFFORT = {
	"cbcn/minimax-m3": "xhigh",
	"cbcn/glm-5.3": "max",
	"cbcn/glm-5.3-flash": "max",
	"cbcn/kimi-k3-1": "xhigh",
	"cbcn/deepseek-v4-pro": "xhigh",
	"cbcn/deepseek-v4-flash": "xhigh",
	"cbcn/deepseek-v4.1-flash": "xhigh",
	"cbcn/kimi-k3": "max",
	"cx/gpt-6-astra": "max",
	"cx/gpt-5.6-sol": "max",
	"cx/gpt-5.6-terra": "max",
	"cx/gpt-5.6-luna": "max",
	"cx/gpt-5.5": "xhigh",
	"ag/gemini-3.8-flash-high": "max",
	"ag/claude-sonnet-4-6": "max",
	"ag/claude-opus-4-6-thinking": "max",
	"ag/gpt-oss-120b-medium": "xhigh",
} as const satisfies Record<string, WireEffort>;

/** Returns the measured wire effort, or undefined until the route is probed. */
export function measuredWireEffort(modelId: string): WireEffort | undefined {
	return Object.hasOwn(MEASURED_WIRE_EFFORT, modelId)
		? MEASURED_WIRE_EFFORT[modelId as keyof typeof MEASURED_WIRE_EFFORT]
		: undefined;
}
