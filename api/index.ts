import type { IncomingMessage, ServerResponse } from "node:http";
import { executeLookup, renovateVersion } from "./service.js";
import { InputError } from "./validate.js";

const MAX_BODY_BYTES = 16 * 1024;

type VercelRequest = IncomingMessage & { body?: unknown };

function send(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, {
		"cache-control": "no-store",
		"content-type": "application/json; charset=utf-8",
		"x-content-type-options": "nosniff",
	});
	response.end(JSON.stringify(body));
}

async function readBody(request: VercelRequest): Promise<unknown> {
	const contentType = request.headers["content-type"] ?? "";
	if (!contentType.toLowerCase().startsWith("application/json")) {
		throw new InputError("Content-Type must be application/json");
	}

	if (request.body !== undefined) {
		const size = Buffer.byteLength(JSON.stringify(request.body));
		if (size > MAX_BODY_BYTES) throw new InputError("Request body is too large");
		return request.body;
	}

	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.byteLength;
		if (size > MAX_BODY_BYTES) throw new InputError("Request body is too large");
		chunks.push(buffer);
	}

	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw new InputError("Request body is not valid JSON");
	}
}

export default async function handler(
	request: VercelRequest,
	response: ServerResponse,
): Promise<void> {
	if (request.method === "GET") {
		send(response, 200, { renovateVersion });
		return;
	}
	if (request.method !== "POST") {
		send(response, 405, { error: "Method not allowed" });
		return;
	}

	try {
		const result = await executeLookup(await readBody(request));
		send(response, 200, { renovateVersion, result });
	} catch (error) {
		if (error instanceof InputError) {
			send(response, 400, { error: error.message });
			return;
		}
		console.error("Renovate lookup failed", error);
		send(response, 502, {
			error: "Lookup failed. Check the package, datasource, version, and registry settings.",
		});
	}
}
