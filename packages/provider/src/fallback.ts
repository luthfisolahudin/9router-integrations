/**
 * Membership served before the first successful discovery, and when the
 * provider cannot be reached.
 *
 * Without this a network failure registers a provider with zero models, which
 * is indistinguishable from a broken integration. Keep the list short and
 * stable; it is a floor, not a catalog.
 */
export const FALLBACK: readonly string[] = ["example-chat-cheap"];
