import type { IncomingMessage, ServerResponse } from "node:http";
import { executeLookup, renovateVersion, serviceDiscovery } from "./service.js";
import { InputError, isInputError } from "./validate.js";

const MAX_BODY_BYTES = 16 * 1024;

type VercelRequest = IncomingMessage & { body?: unknown };

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		throw new InputError("Request body is not valid JSON");
	}
}

function send(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, {
		"cache-control": "no-store",
		"content-type": "application/json; charset=utf-8",
		"x-content-type-options": "nosniff",
		link: '</llms.txt>; rel="describedby", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
	});
	response.end(JSON.stringify(body));
}

async function readBody(request: VercelRequest): Promise<unknown> {
	const contentType = request.headers["content-type"] ?? "";
	if (!contentType.toLowerCase().startsWith("application/json")) {
		throw new InputError("Content-Type must be application/json");
	}

	try {
		const body = request.body;
		if (body !== undefined) {
			const rawBody =
				typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : undefined;
			if (rawBody !== undefined) {
				if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES)
					throw new InputError("Request body is too large");
				return parseJson(rawBody);
			}

			const size = Buffer.byteLength(JSON.stringify(body));
			if (size > MAX_BODY_BYTES) throw new InputError("Request body is too large");
			return body;
		}
	} catch (error) {
		if (isInputError(error)) throw error;
		throw new InputError("Request body is not valid JSON");
	}

	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.byteLength;
		if (size > MAX_BODY_BYTES) throw new InputError("Request body is too large");
		chunks.push(buffer);
	}

	return parseJson(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(
	request: VercelRequest,
	response: ServerResponse,
): Promise<void> {
	if (request.method === "GET") {
		send(response, 200, serviceDiscovery);
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
		if (isInputError(error)) {
			send(response, 400, { error: error.message });
			return;
		}
		if (error instanceof Error && error.name === "SyntaxError") {
			send(response, 400, { error: "Request body is not valid JSON" });
			return;
		}
		console.error("Renovate lookup failed", error);
		send(response, 502, {
			error: "Lookup failed. Check the package, datasource, version, and registry settings.",
		});
	}
}
