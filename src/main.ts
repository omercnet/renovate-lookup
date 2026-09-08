type Update = {
	updateType?: string;
	newValue?: string;
	newVersion?: string;
	releaseTimestamp?: string;
	isBreaking?: boolean;
};

type LookupResult = {
	updates?: Update[];
	versioning?: string;
	currentVersion?: string;
	sourceUrl?: string;
	homepage?: string;
	warnings?: unknown[];
	[key: string]: unknown;
};

type ApiResponse = {
	renovateVersion?: string;
	result?: LookupResult;
	error?: string;
};

function requiredElement<T extends Element>(selector: string, root: ParentNode = document): T {
	const node = root.querySelector<T>(selector);
	if (!node) throw new Error(`Required element not found: ${selector}`);
	return node;
}

const form = requiredElement<HTMLFormElement>("#lookup-form");
const submit = requiredElement<HTMLButtonElement>("#submit-button");
const statusNode = requiredElement<HTMLElement>("#result-status");
const empty = requiredElement<HTMLElement>("#result-empty");
const content = requiredElement<HTMLElement>("#result-content");
const errorBox = requiredElement<HTMLElement>("#result-error");
const version = requiredElement<HTMLElement>("#renovate-version");
const buttonLabel = requiredElement<HTMLElement>(".button-label", submit);
let activeRequest: AbortController | undefined;

function element<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className?: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function formatDate(value?: string): string {
	if (!value) return "Release date unknown";
	const date = new Date(value);
	return Number.isNaN(date.valueOf())
		? value
		: date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
}

function payloadFromForm(): Record<string, unknown> {
	const data = new FormData(form);
	const payload: Record<string, unknown> = {};
	for (const key of [
		"depName",
		"packageName",
		"currentValue",
		"manager",
		"versioning",
		"rangeStrategy",
		"datasource",
	]) {
		const value = data.get(key);
		if (typeof value === "string" && value.trim()) payload[key] = value.trim();
	}
	const registry = data.get("registryUrls");
	if (typeof registry === "string" && registry.trim()) payload.registryUrls = [registry.trim()];
	if (data.get("separateMinorPatch") === "on") payload.separateMinorPatch = true;
	return payload;
}

async function readApiResponse(response: Response): Promise<ApiResponse> {
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		throw new Error(`Lookup service returned HTTP ${response.status}`);
	}
	return (await response.json()) as ApiResponse;
}

function renderResult(result: LookupResult, request: Record<string, unknown>): void {
	content.replaceChildren();
	const heading = element("div", "result-heading");
	const identity = element("div");
	identity.append(
		element("p", "result-kicker", String(request.datasource ?? "package")),
		element("h3", "package-name", String(request.depName)),
	);
	const meta = element("span", "versioning-badge", result.versioning ?? "default versioning");
	heading.append(identity, meta);

	const rail = element("div", "version-rail");
	const origin = element("div", "version-node current");
	origin.append(
		element("span", "node-type", "CURRENT"),
		element(
			"strong",
			"node-version",
			String(request.currentValue ?? result.currentVersion ?? "unknown"),
		),
	);
	rail.append(origin);

	const updates = result.updates ?? [];
	if (!updates.length) {
		const none = element("div", "no-updates");
		none.append(
			element("strong", "", "No updates found"),
			element("span", "", "This value is current, or the datasource returned no newer release."),
		);
		rail.append(none);
	} else {
		for (const update of updates) {
			const node = element("div", `version-node update ${update.isBreaking ? "breaking" : ""}`);
			const type = (update.updateType ?? "update").toUpperCase();
			node.append(
				element("span", "node-type", type),
				element("strong", "node-version", update.newValue ?? update.newVersion ?? "unknown"),
				element("small", "node-date", formatDate(update.releaseTimestamp)),
			);
			rail.append(node);
		}
	}

	const raw = element("details", "raw-output");
	const rawSummary = element("summary", "", "Raw Renovate response");
	const copy = element("button", "copy-button", "Copy JSON");
	copy.type = "button";
	const pre = element("pre");
	const code = element("code", "", JSON.stringify(result, null, 2));
	pre.append(code);
	copy.addEventListener("click", async () => {
		await navigator.clipboard.writeText(code.textContent ?? "");
		copy.textContent = "Copied";
		setTimeout(() => (copy.textContent = "Copy JSON"), 1200);
	});
	raw.append(rawSummary, copy, pre);
	content.append(heading, rail, raw);
}

function setLoading(loading: boolean): void {
	submit.disabled = loading;
	buttonLabel.textContent = loading ? "Looking up..." : "Look up updates";
	if (loading) statusNode.textContent = "RUNNING";
	statusNode.classList.toggle("running", loading);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	activeRequest?.abort();
	activeRequest = new AbortController();
	setLoading(true);
	empty.hidden = true;
	content.hidden = true;
	errorBox.hidden = true;
	const payload = payloadFromForm();
	try {
		const response = await fetch("/api", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
			signal: activeRequest.signal,
		});
		const data = await readApiResponse(response);
		if (!response.ok) throw new Error(data.error ?? `Lookup failed with HTTP ${response.status}`);
		if (!data.result) throw new Error("The server returned no lookup result");
		if (data.renovateVersion) version.textContent = data.renovateVersion;
		renderResult(data.result, payload);
		content.hidden = false;
		statusNode.textContent = "COMPLETE";
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") return;
		errorBox.textContent = error instanceof Error ? error.message : "Lookup failed";
		errorBox.hidden = false;
		statusNode.textContent = "FAILED";
	} finally {
		setLoading(false);
	}
});

fetch("/api")
	.then(readApiResponse)
	.then((data) => {
		if (data.renovateVersion) version.textContent = data.renovateVersion;
	})
	.catch(() => {
		version.textContent = "unavailable";
	});
