import renovatePackage from "renovate/package.json" with { type: "json" };
import { parseLookupInput } from "./validate.js";

export const renovateVersion = renovatePackage.version;

export const serviceDiscovery = {
	name: "Renovate Lookup API",
	description: "Run a Renovate package update lookup with JSON input and output.",
	apiVersion: "1.0.0",
	renovateVersion,
	documentation: "/llms.txt",
	openapi: "/openapi.json",
	endpoint: {
		method: "POST",
		path: "/api",
		contentType: "application/json",
	},
	example: {
		depName: "webpack",
		currentValue: "3.7.0",
		datasource: "npm",
	},
} as const;

let runtime: Promise<typeof import("./runtime.js")> | undefined;

function loadRuntime(): Promise<typeof import("./runtime.js")> {
	// Renovate's optional native RE2 module targets Node's V8 ABI, not Bun.
	// The JavaScript fallback is sufficient for a constrained lookup service
	// and keeps the serverless bundle portable.
	process.env.RENOVATE_X_IGNORE_RE2 = "true";
	runtime ??= import("./runtime.js");
	return runtime;
}

export async function executeLookup(value: unknown): Promise<unknown> {
	const input = parseLookupInput(value);
	return (await loadRuntime()).runLookup(input);
}
