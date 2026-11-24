import { defineConfig } from "@playwright/test";

// Runs against a running Findora instance connected to a TEST Supabase project.
// E2E_BASE_URL=http://localhost:3000 npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", channel: process.env.E2E_CHANNEL ?? "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
