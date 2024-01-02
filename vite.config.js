import { defineConfig } from "vite";

export default defineConfig({
    test: {
        include: ["backend/**/*.test.mjs"],
        environment: "node",
        globals: true,
    },
});
