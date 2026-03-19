import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const fromRoot = (relativePath: string) =>
  decodeURIComponent(new URL(relativePath, import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@natural-fiber-atlas/admin-ui/styles.css",
        replacement: fromRoot("./packages/admin-ui/styles.css"),
      },
      {
        find: "@natural-fiber-atlas/admin-ui",
        replacement: fromRoot("./packages/admin-ui/src/index.ts"),
      },
      { find: "@/contexts", replacement: path.resolve(__dirname, "./src/app/components/admin/runtime") },
      { find: "@/database-interface", replacement: path.resolve(__dirname, "./src/app/components/admin/database-interface") },
      { find: "@/components", replacement: path.resolve(__dirname, "./src/app/components/admin") },
      { find: "@/utils", replacement: path.resolve(__dirname, "./src/app/utils/admin") },
      { find: "@/hooks", replacement: path.resolve(__dirname, "./src/app/hooks/admin") },
      { find: "@/data", replacement: path.resolve(__dirname, "./src/app/data/admin") },
      { find: "@/config", replacement: path.resolve(__dirname, "./src/app/config") },
      { find: "@/lib", replacement: path.resolve(__dirname, "./src/app/lib") },
      { find: "@/types", replacement: path.resolve(__dirname, "./src/app/types") },
      { find: "@/cms", replacement: path.resolve(__dirname, "./src/app/cms") },
      { find: "@/services", replacement: path.resolve(__dirname, "./src/app/services") },
      { find: "@/styles", replacement: path.resolve(__dirname, "./src/styles") },
      { find: "@", replacement: path.resolve(__dirname, "./src/app") },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 5,
        functions: 5,
        branches: 5,
        statements: 5,
      },
    },
  },
});
