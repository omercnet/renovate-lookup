const RENOVATE_VERSION = "44.69.7";

function runtimeError(error: unknown): Response {
	console.error("Unhandled lookup server error", error);
	const detail =
		process.env.VERCEL_ENV === "preview" && error instanceof Error ? error.message : undefined;
	return Response.json({ error: "Lookup service failed to start", detail }, { status: 500 });
}

Bun.serve({
	async fetch(request) {
		const path = new URL(request.url).pathname;
		if (path === "/api" || path === "/api/server") {
			if (request.method === "GET") {
				return Response.json({ renovateVersion: RENOVATE_VERSION });
			}
			try {
				const { handleLookup } = await import("./lookup.js");
				return handleLookup(request);
			} catch (error) {
				return runtimeError(error);
			}
		}
		return new Response("Not found", { status: 404 });
	},
	error: runtimeError,
});
