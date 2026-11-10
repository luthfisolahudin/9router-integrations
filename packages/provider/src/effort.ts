/**
 * Measured wire effort per model.
 *
 * An entry here is a claim backed by an entry in `docs/EVIDENCE.md`: date,
 * command, and the observed signature. Never add one from intuition, and never
 * add one because a model *looks* like it should support a level.
 *
 * A model with no entry stays visible without an effort menu. That is the
 * correct outcome for an unmeasured route, and `task check:catalog` reports it.
 */
export const MEASURED_WIRE_EFFORT: Readonly<Record<string, string>> = {
	"example-chat-1": "max",
};
