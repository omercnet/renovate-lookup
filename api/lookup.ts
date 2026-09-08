import { mergeChildConfig } from "renovate/dist/config/utils.js";
import { init as initLogger } from "renovate/dist/logger/index.js";
import { clear as clearHostRules } from "renovate/dist/util/host-rules.js";
import * as defaultsParser from "renovate/dist/workers/global/config/parse/index.js";
import { getRepositoryConfig } from "renovate/dist/workers/global/index.js";
import { globalFinalize, globalInitialize } from "renovate/dist/workers/global/initialize.js";
import { lookupUpdates } from "renovate/dist/workers/repository/process/lookup/index.js";
import renovatePackage from "renovate/package.json" with { type: "json" };
import { InputError, parseLookupInput } from "./validate.ts";

const MAX_BODY_BYTES = 16 * 1024;
let queue = Promise.resolve();
await initLogger();

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

function json(value: unknown, status = 200): Response {
	return Response.json(value, {
		status,
		headers: {
			"cache-control": "no-store",
			"x-content-type-options": "nosniff",
		},
	});
}

async function readJson(request: Request): Promise<unknown> {
	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().startsWith("application/json"))
		throw new InputError("Content-Type must be application/json");
	const length = Number(request.headers.get("content-length"));
	if (Number.isFinite(length) && length > MAX_BODY_BYTES)
		throw new InputError("Request body is too large");
	const text = await request.text();
	if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES)
		throw new InputError("Request body is too large");
	try {
		return JSON.parse(text);
	} catch {
		throw new InputError("Request body is not valid JSON");
	}
}

async function runLookup(raw: unknown): Promise<unknown> {
	const input = parseLookupInput(raw);
	return exclusively(async () => {
		clearHostRules();
		let config = await defaultsParser.parseConfigs(process.env, []);
		if (!input.repository) config = mergeChildConfig(config, { platform: "local" });
		config = mergeChildConfig(config, input);
		let initialized = false;
		try {
			config = await globalInitialize(config);
			initialized = true;
			if (input.repository) config = await getRepositoryConfig(config, input.repository);
			const result = await lookupUpdates(config);
			return result.unwrapOrThrow();
		} finally {
			if (initialized) await globalFinalize(config);
			clearHostRules();
		}
	});
}

export async function handleLookup(request: Request): Promise<Response> {
	if (request.method === "GET") return json({ renovateVersion: renovatePackage.version });
	if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
	try {
		const result = await runLookup(await readJson(request));
		return json({ renovateVersion: renovatePackage.version, result });
	} catch (error) {
		if (error instanceof InputError) return json({ error: error.message }, 400);
		console.error("Renovate lookup failed", error);
		return json(
			{
				error: "Lookup failed. Check the package, datasource, version, and registry settings.",
			},
			502,
		);
	}
}
