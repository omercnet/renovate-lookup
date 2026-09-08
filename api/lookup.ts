import renovatePackage from "renovate/package.json" with { type: "json" };
import { InputError, parseLookupInput } from "./validate.ts";

const MAX_BODY_BYTES = 16 * 1024;
let runtime: Promise<typeof import("./runtime.ts")> | undefined;

function loadRuntime(): Promise<typeof import("./runtime.ts")> {
	runtime ??= import("./runtime.ts");
	return runtime;
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

export async function handleLookup(request: Request): Promise<Response> {
	if (request.method === "GET") return json({ renovateVersion: renovatePackage.version });
	if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
	try {
		const input = parseLookupInput(await readJson(request));
		const result = await (await loadRuntime()).runLookup(input);
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
