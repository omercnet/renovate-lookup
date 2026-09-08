Bun.serve({
	async fetch(request) {
		const path = new URL(request.url).pathname;
		if (path === "/api" || path === "/api/server") {
			const { handleLookup } = await import("./lookup.ts");
			return handleLookup(request);
		}
		return new Response("Not found", { status: 404 });
	},
	error(error) {
		console.error("Unhandled lookup server error", error);
		return Response.json({ error: "Lookup service failed to start" }, { status: 500 });
	},
});
