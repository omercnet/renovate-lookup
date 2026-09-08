import { afterEach, describe, expect, test } from "bun:test";
import { InputError, parseLookupInput } from "./validate.ts";

const originalRepositorySetting = process.env.LOOKUP_ENABLE_REPOSITORY;
const originalRegistries = process.env.LOOKUP_ALLOWED_REGISTRIES;

afterEach(() => {
	if (originalRepositorySetting === undefined) delete process.env.LOOKUP_ENABLE_REPOSITORY;
	else process.env.LOOKUP_ENABLE_REPOSITORY = originalRepositorySetting;
	if (originalRegistries === undefined) delete process.env.LOOKUP_ALLOWED_REGISTRIES;
	else process.env.LOOKUP_ALLOWED_REGISTRIES = originalRegistries;
});

describe("parseLookupInput", () => {
	test("accepts and normalizes the public lookup contract", () => {
		expect(
			parseLookupInput({
				depName: " webpack ",
				datasource: "npm",
				registryUrls: ["https://registry.npmjs.org/"],
			}),
		).toEqual({
			depName: "webpack",
			packageName: "webpack",
			datasource: "npm",
			registryUrls: ["https://registry.npmjs.org/"],
		});
	});

	test("rejects arbitrary Renovate global configuration", () => {
		expect(() =>
			parseLookupInput({
				depName: "webpack",
				datasource: "npm",
				endpoint: "https://attacker.test",
				token: "secret",
			}),
		).toThrow(new InputError("Unknown fields: endpoint, token"));
	});

	test("rejects registry SSRF unless its origin is explicitly allowed", () => {
		expect(() =>
			parseLookupInput({
				depName: "x",
				datasource: "npm",
				registryUrls: ["http://127.0.0.1:8080/"],
			}),
		).toThrow("Registry origin is not allowed");
	});

	test("allows configured registry origins without credentials", () => {
		process.env.LOOKUP_ALLOWED_REGISTRIES = "https://packages.example.com";
		expect(
			parseLookupInput({
				depName: "x",
				datasource: "npm",
				registryUrls: ["https://user:pass@packages.example.com/npm/"],
			}).registryUrls,
		).toEqual(["https://packages.example.com/npm/"]);
	});

	test("keeps repository lookups opt-in", () => {
		delete process.env.LOOKUP_ENABLE_REPOSITORY;
		expect(() =>
			parseLookupInput({
				depName: "x",
				datasource: "npm",
				repository: "owner/repo",
			}),
		).toThrow("Repository-aware lookup is not enabled");
	});
});
