import type { AllConfig } from "renovate/dist/config/types.js";
import { init as initLogger } from "renovate/dist/logger/index.js";
import { lookupUpdates } from "renovate/dist/workers/repository/process/lookup/index.js";
import type { LookupInput } from "./validate.js";

const loggerReady = initLogger();

export async function runLookup(input: LookupInput): Promise<unknown> {
	await loggerReady;
	const config = {
		separateMajorMinor: true,
		updatePinnedDependencies: true,
		...input,
	} as AllConfig;
	const result = await lookupUpdates(config);
	return result.unwrapOrThrow();
}
