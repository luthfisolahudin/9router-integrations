import { buildModels, readSnapshot, refreshCatalog, snapshotPath, writeSnapshot } from "@luthfisolahudin/ai-provider-integrations-template-catalog";
import type { Pack } from "@luthfisolahudin/ai-provider-integrations-template-contract";
import { MEASURED_WIRE_EFFORT, measuredIds, packs } from "@luthfisolahudin/ai-provider-integrations-template-provider";
import { createProvider, openAICompletionsApi } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { toPiModels, type HostOptions } from "./model.ts";

const TTL_MS = 10 * 60_000;

function hostOptions(pack: Pack): HostOptions {
	return {
		providerId: pack.id,
		baseUrl: pack.baseUrl,
		...(pack.hosts?.pi?.compat === undefined ? {} : { compat: pack.hosts.pi.compat }),
	};
}

/**
 * Models registered before any network call, so `pi --list-models` and the
 * startup model selection work on a cold or offline machine. Pi then calls
 * `fetchModels` and owns persistence; this adapter never writes the catalog.
 */
function baseline(pack: Pack) {
	const snapshot = readSnapshot(snapshotPath({ providerId: pack.id }));
	const models = buildModels(pack, snapshot?.raw ?? [], { measuredIds });
	return toPiModels(models, MEASURED_WIRE_EFFORT, hostOptions(pack));
}

function apiKeyAuth(pack: Pack) {
	const envName = pack.auth?.apiKeyEnv;
	return {
		name: `${pack.name} API key`,
		async resolve({ credential }: { credential?: { key?: string } }) {
			const key = credential?.key ?? (envName === undefined ? undefined : process.env[envName]);
			if (key === undefined || key.trim().length === 0) return undefined;
			return { auth: { apiKey: key.trim() }, ...(envName === undefined ? {} : { source: envName }) };
		},
	};
}

/** Registers every pack this repo ships as a native Pi provider. */export default function registerExampleProvider(pi: ExtensionAPI): void {
	for (const pack of packs) {
		pi.registerProvider(
			createProvider({
				id: pack.id,
				name: pack.name,
				baseUrl: pack.baseUrl,
				auth: { apiKey: apiKeyAuth(pack) },
				models: baseline(pack),
				async fetchModels(context) {
					if (!context.allowNetwork || context.signal.aborted) return baseline(pack);
					try {
						const outcome = await refreshCatalog(pack, {
							snapshot: readSnapshot(snapshotPath({ providerId: pack.id })),
							ttlMs: TTL_MS,
							signal: context.signal,
							measuredIds,
						});
						if (outcome.source === "network" && outcome.models.length > 0) {
							// Keep our own snapshot so both hosts start warm, not just Pi.
							writeSnapshot(snapshotPath({ providerId: pack.id }), {
								checkedAt: outcome.checkedAt,
								...(outcome.etag === undefined ? {} : { etag: outcome.etag }),
								raw: outcome.raw ?? [],
							});
						}
						return toPiModels(outcome.models, MEASURED_WIRE_EFFORT, hostOptions(pack));
					} catch {
						// A network failure must never empty the provider.
						return baseline(pack);
					}
				},
				api: openAICompletionsApi(),
			}),
		);
	}
}
