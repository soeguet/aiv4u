import { describe, it, expect } from "vitest";
import { ensureTrailingSlash } from "./user-path.mjs";
import process from "node:process";

describe("ensureTrailingSlash", () => {
    it("adds a slash to a path without a trailing slash", () => {
        const path = "testPath";
        const expected = "testPath/";
        expect(ensureTrailingSlash(path)).toBe(expected);
    });

    it("does not change a path with a trailing slash", () => {
        const path = "testPath/";
        expect(ensureTrailingSlash(path)).toBe(path);
    });

    it("does not change a path with a trailing backslash", () => {
        const path = "testPath\\";
        expect(ensureTrailingSlash(path)).toBe(path);
    });

    it("adds a backslash to a path on Windows", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });
        const path = "testPath";
        const expected = "testPath\\";
        expect(ensureTrailingSlash(path)).toBe(expected);
        Object.defineProperty(process, "platform", { value: originalPlatform });
    });
});
