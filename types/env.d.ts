// Minimal ambient shim so the typecheck runs without @types/node. The repo has
// no runtime dependencies; these are the only Node globals the code touches.
declare const process: {
	env: Record<string, string | undefined>;
};
