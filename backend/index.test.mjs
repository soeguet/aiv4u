import app from "../backend/index.mjs";

describe("My App", () => {
    it("should return a 200 status code", async () => {

        app.listen(3000);

        const response = await fetch("http://localhost:3000/api/v1/folder-path");

        expect(response.status).toBe(200);
    });
});

