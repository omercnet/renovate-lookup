import { executeLookup, renovateVersion, serviceDiscovery } from "./api/service.js";
import { InputError } from "./api/validate.js";
import homepage from "./index.html";

const MAX_BODY_BYTES = 16 * 1024;

function json(body: unknown, status = 200): Response {
	return Response.json(body, {
		status,
		headers: {
			"cache-control": "no-store",
			"x-content-type-options": "nosniff",
			link: '</llms.txt>; rel="describedby", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
		},
	});
}

async function handleLookup(request: Request): Promise<Response> {
	if (request.method === "GET") return json(serviceDiscovery);
	try {
		const contentType = request.headers.get("content-type") ?? "";
		if (!contentType.toLowerCase().startsWith("application/json")) {
			throw new InputError("Content-Type must be application/json");
		}
		const text = await request.text();
		if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
			throw new InputError("Request body is too large");
		}
		const result = await executeLookup(JSON.parse(text));
		return json({ renovateVersion, result });
	} catch (error) {
		if (error instanceof InputError) return json({ error: error.message }, 400);
		if (error instanceof SyntaxError) return json({ error: "Request body is not valid JSON" }, 400);
		console.error("Renovate lookup failed", error);
		return json(
			{ error: "Lookup failed. Check the package, datasource, version, and registry settings." },
			502,
		);
	}
}

const server = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	development: process.env.NODE_ENV !== "production",
	routes: {
		"/": homepage,
		"/llms.txt": () =>
			new Response(Bun.file("public/llms.txt"), {
				headers: { "content-type": "text/plain; charset=utf-8" },
			}),
		"/openapi.json": () =>
			new Response(Bun.file("public/openapi.json"), {
				headers: { "content-type": "application/json; charset=utf-8" },
			}),
		"/api": {
			GET: handleLookup,
			POST: handleLookup,
		},
	},
	fetch() {
		return new Response("Not found", { status: 404 });
	},
});

console.log(`Renovate Lookup running at ${server.url}`);
