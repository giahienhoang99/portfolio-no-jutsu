/** Exercises enabled and disabled analytics server-environment validation. */
import { describe, expect, it } from "vitest";
import type { AnalyticsPublicConfig } from "@portfolio-no-jutsu/contracts";
import { loadAnalyticsServerConfig } from "./server-config";

const disabledConfig: AnalyticsPublicConfig = {
  enabled: false,
  retentionDays: 60,
  refreshIntervalSeconds: 15,
  sessionTimeoutMinutes: 30,
  metrics: {
    dailyVisits: true,
    dailyUniqueVisitors: true,
    resumeViews: true,
    resumeDownloads: true,
  },
};

const enabledConfig: AnalyticsPublicConfig = { ...disabledConfig, enabled: true };

const validEnvironment = {
  TURSO_DATABASE_URL: "libsql://pnj-analytics.example.turso.io",
  TURSO_AUTH_TOKEN: "database-token",
  ANALYTICS_ADMIN_TOKEN: "a".repeat(32),
  ANALYTICS_HASH_SECRET: "h".repeat(32),
  ANALYTICS_ALLOWED_ORIGINS: "http://localhost:3000, https://hienhoang.dev",
  CRON_SECRET: "c".repeat(32),
};

describe("loadAnalyticsServerConfig", () => {
  it("does not require secrets when analytics is disabled", () => {
    expect(loadAnalyticsServerConfig(disabledConfig, {})).toEqual({ enabled: false });
  });

  it("loads and normalizes valid enabled settings", () => {
    expect(loadAnalyticsServerConfig(enabledConfig, validEnvironment)).toEqual({
      enabled: true,
      databaseUrl: "libsql://pnj-analytics.example.turso.io",
      databaseAuthToken: "database-token",
      adminToken: "a".repeat(32),
      hashSecret: "h".repeat(32),
      allowedOrigins: ["http://localhost:3000", "https://hienhoang.dev"],
      cronSecret: "c".repeat(32),
    });
  });

  it("reports every missing enabled-mode variable", () => {
    expect(() => loadAnalyticsServerConfig(enabledConfig, {})).toThrow(
      "Missing analytics server environment variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, ANALYTICS_ADMIN_TOKEN, ANALYTICS_HASH_SECRET, ANALYTICS_ALLOWED_ORIGINS, CRON_SECRET",
    );
  });

  it.each([
    [{ ...validEnvironment, TURSO_DATABASE_URL: "not-a-url" }, "TURSO_DATABASE_URL must be a valid URL"],
    [{ ...validEnvironment, TURSO_DATABASE_URL: "file:local.db" }, "TURSO_DATABASE_URL must use libsql:// or https://"],
    [{ ...validEnvironment, ANALYTICS_ADMIN_TOKEN: "short" }, "ANALYTICS_ADMIN_TOKEN must contain at least 32 characters"],
    [{ ...validEnvironment, ANALYTICS_HASH_SECRET: "short" }, "ANALYTICS_HASH_SECRET must contain at least 32 characters"],
    [{ ...validEnvironment, CRON_SECRET: "short" }, "CRON_SECRET must contain at least 32 characters"],
    [{ ...validEnvironment, ANALYTICS_ALLOWED_ORIGINS: "not-a-url" }, "ANALYTICS_ALLOWED_ORIGINS contains an invalid URL"],
    [
      { ...validEnvironment, ANALYTICS_ALLOWED_ORIGINS: "https://user:password@example.com" },
      "ANALYTICS_ALLOWED_ORIGINS must contain origins only",
    ],
    [{ ...validEnvironment, ANALYTICS_ALLOWED_ORIGINS: "https://example.com/path" }, "ANALYTICS_ALLOWED_ORIGINS must contain origins only"],
  ])("rejects malformed enabled-mode settings", (environment, message) => {
    expect(() => loadAnalyticsServerConfig(enabledConfig, environment)).toThrow(message);
  });
});
