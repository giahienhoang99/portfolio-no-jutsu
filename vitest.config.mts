/** Configures unit-test discovery, Node execution, coverage reporting, and minimum thresholds. */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "apps/web/src/lib/analytics/client.ts",
        "apps/web/src/lib/analytics/event-handler.ts",
        "apps/web/src/lib/analytics/event-service.ts",
        "apps/web/src/lib/analytics/metrics-handler.ts",
        "apps/web/src/lib/analytics/private-auth.ts",
        "apps/web/src/lib/analytics/retention-handler.ts",
        "apps/web/src/lib/analytics/resume-download.ts",
        "apps/web/src/lib/analytics/resume-view-tracking.ts",
        "apps/web/src/lib/analytics/server-config.ts",
        "apps/web/src/lib/portfolio-config.ts",
        "packages/contracts/src/index.ts",
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
