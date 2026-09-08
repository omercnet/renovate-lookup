declare module "renovate/dist/workers/global/initialize.js" {
	type RenovateConfig = import("renovate/dist/config/types.js").AllConfig;

	export function globalInitialize(config: RenovateConfig): Promise<RenovateConfig>;
	export function globalFinalize(config: RenovateConfig): Promise<void>;
}

declare module "renovate/dist/workers/global/index.js" {
	type RenovateConfig = import("renovate/dist/config/types.js").AllConfig;

	export function getRepositoryConfig(
		config: RenovateConfig,
		repository: string,
	): Promise<RenovateConfig>;
}

declare module "renovate/dist/workers/repository/process/lookup/index.js" {
	type RenovateConfig = import("renovate/dist/config/types.js").AllConfig;

	export function lookupUpdates(config: RenovateConfig): Promise<{ unwrapOrThrow(): unknown }>;
}
