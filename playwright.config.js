import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      executablePath: process.env.TEST_BROWSER_PATH || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
