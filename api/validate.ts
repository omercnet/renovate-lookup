export type LookupInput = {
	depName: string;
	packageName: string;
	datasource: string;
	currentValue?: string;
	currentVersion?: string;
	currentDigest?: string;
	manager?: string;
	versioning?: string;
	rangeStrategy?: string;
	registryUrls?: string[];
	separateMinorPatch?: boolean;
};

const allowedKeys = new Set([
	"depName",
	"packageName",
	"datasource",
	"currentValue",
	"currentVersion",
	"currentDigest",
	"manager",
	"versioning",
	"rangeStrategy",
	"registryUrls",
	"separateMinorPatch",
]);

export class InputError extends Error {}

function readString(
	body: Record<string, unknown>,
	key: string,
	options: { required?: boolean; max?: number } = {},
): string | undefined {
	const value = body[key];
	if (value === undefined || value === null || value === "") {
		if (options.required) throw new InputError(`${key} is required`);
		return undefined;
	}
	if (typeof value !== "string") throw new InputError(`${key} must be a string`);
	const trimmed = value.trim();
	if (!trimmed) {
		if (options.required) throw new InputError(`${key} is required`);
		return undefined;
	}
	if (trimmed.length > (options.max ?? 256)) throw new InputError(`${key} is too long`);
	return trimmed;
}

function readRequiredString(body: Record<string, unknown>, key: string, max: number): string {
	const value = readString(body, key, { required: true, max });
	if (!value) throw new InputError(`${key} is required`);
	return value;
}

function allowedRegistryOrigins(): Set<string> {
	const configured = process.env.LOOKUP_ALLOWED_REGISTRIES ?? "https://registry.npmjs.org";
	return new Set(
		configured
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean)
			.map((value) => new URL(value).origin),
	);
}

function readRegistries(body: Record<string, unknown>): string[] | undefined {
	const value = body.registryUrls;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.length > 5) {
		throw new InputError("registryUrls must be an array of at most 5 URLs");
	}
	const allowed = allowedRegistryOrigins();
	return value.map((item) => {
		if (typeof item !== "string" || item.length > 512)
			throw new InputError("registryUrls contains an invalid URL");
		let url: URL;
		try {
			url = new URL(item);
		} catch {
			throw new InputError("registryUrls contains an invalid URL");
		}
		if (url.protocol !== "https:" || !allowed.has(url.origin)) {
			throw new InputError(`Registry origin is not allowed: ${url.origin}`);
		}
		url.username = "";
		url.password = "";
		return url.toString();
	});
}

export function parseLookupInput(value: unknown): LookupInput {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new InputError("Request body must be an object");
	const body = value as Record<string, unknown>;
	const unknown = Object.keys(body).filter((key) => !allowedKeys.has(key));
	if (unknown.length)
		throw new InputError(`Unknown field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);

	const depName = readRequiredString(body, "depName", 200);
	const datasource = readRequiredString(body, "datasource", 64);
	if (body.separateMinorPatch !== undefined && typeof body.separateMinorPatch !== "boolean") {
		throw new InputError("separateMinorPatch must be a boolean");
	}

	return {
		depName,
		packageName: readString(body, "packageName", { max: 200 }) ?? depName,
		datasource,
		currentValue: readString(body, "currentValue"),
		currentVersion: readString(body, "currentVersion"),
		currentDigest: readString(body, "currentDigest"),
		manager: readString(body, "manager", { max: 64 }),
		versioning: readString(body, "versioning", { max: 64 }),
		rangeStrategy: readString(body, "rangeStrategy", { max: 64 }),
		registryUrls: readRegistries(body),
		separateMinorPatch: body.separateMinorPatch as boolean | undefined,
	};
}
