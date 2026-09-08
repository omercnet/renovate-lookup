import { handleLookup } from "./api/lookup.ts";
import homepage from "./index.html";

const server = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	development: process.env.NODE_ENV !== "production",
	routes: {
		"/": homepage,
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
