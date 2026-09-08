import { handleLookup } from "./lookup.ts";

Bun.serve({
	fetch(request) {
		const path = new URL(request.url).pathname;
		if (path === "/api" || path === "/api/server") return handleLookup(request);
		return new Response("Not found", { status: 404 });
	},
});
