import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./index.mjs";

describe("GET /api/v1/folder-path", () => {
    it("should return the main directory path", async () => {
        const response = await request(app).get("/api/v1/folder-path");
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ path: "/home/soeguet/Downloads/" });
    });
});
