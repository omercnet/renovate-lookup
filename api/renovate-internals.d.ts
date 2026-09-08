declare module "renovate/dist/workers/repository/process/lookup/index.js" {
	type AllConfig = import("renovate/dist/config/types.js").AllConfig;

	export function lookupUpdates(config: AllConfig): Promise<{ unwrapOrThrow(): unknown }>;
}
