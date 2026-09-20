export type WireEffort = "max" | "xhigh";

export const MEASURED_WIRE_EFFORT = {
	"cbcn/minimax-m3": "xhigh",
	"cbcn/glm-5.3": "xhigh",
	"cbcn/glm-5.3-flash": "xhigh",
	"cbcn/kimi-k3": "xhigh",
	"cbcn/deepseek-v4.1-flash": "xhigh",
	"cx/gpt-6-astra": "xhigh",
	"cx/gpt-5.6-sol": "xhigh",
	"cx/gpt-5.6-terra": "xhigh",
	"cx/gpt-5.6-luna": "xhigh",
	"cx/gpt-5.5": "xhigh",
	"ag/gemini-3.8-flash-high": "max",
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
