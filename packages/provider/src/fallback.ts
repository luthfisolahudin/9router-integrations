/**
 * Membership served before the first successful discovery, and when the router is
 * down: the DeepSeek V4.1 Flash default plus the pinned GPT 5.6 Terra fallback.
 *
 * Facts for these two live in `curated.ts`, so an offline client keeps the same
 * vision, tool and context information it has when the router is up.
 */
export const FALLBACK: readonly string[] = ["cbcn/deepseek-v4.1-flash", "cx/gpt-5.6-terra"];
