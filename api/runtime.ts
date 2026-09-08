import { mergeChildConfig } from "renovate/dist/config/utils.js";
import { init as initLogger } from "renovate/dist/logger/index.js";
import { clear as clearHostRules } from "renovate/dist/util/host-rules.js";
import * as defaultsParser from "renovate/dist/workers/global/config/parse/index.js";
import { getRepositoryConfig } from "renovate/dist/workers/global/index.js";
import { globalFinalize, globalInitialize } from "renovate/dist/workers/global/initialize.js";
import { lookupUpdates } from "renovate/dist/workers/repository/process/lookup/index.js";
import type { LookupInput } from "./validate.ts";

let queue = Promise.resolve();
const loggerReady = initLogger();

async function exclusively<T>(operation: () => Promise<T>): Promise<T> {
	const previous = queue;
	let release!: () => void;
	queue = new Promise<void>((resolve) => {
		release = resolve;
	});
	await previous;
	try {
		return await operation();
	} finally {
		release();
	}
}

export async function runLookup(input: LookupInput): Promise<unknown> {
	await loggerReady;
	return exclusively(async () => {
		clearHostRules();
		let config = await defaultsParser.parseConfigs(process.env, []);
		config = mergeChildConfig(config, input);

		if (!input.repository) {
			try {
				const result = await lookupUpdates(config);
				return result.unwrapOrThrow();
			} finally {
				clearHostRules();
			}
		}

		let initialized = false;
		try {
			config = await globalInitialize(config);
			initialized = true;
			config = await getRepositoryConfig(config, input.repository);
			const result = await lookupUpdates(config);
			return result.unwrapOrThrow();
		} finally {
			if (initialized) await globalFinalize(config);
			clearHostRules();
		}
	});
}
