/** Verifies strict, server-only dashboard environment validation. */
import { describe, expect, it } from "vitest";

import {
  DashboardConfigurationError,
  loadDashboardConfig,
} from "./dashboard-config";

const validEnvironment = {
  PORTFOLIO_METRICS_API_URL: "https://hienhoang.dev/api/metrics",
  ANALYTICS_ADMIN_TOKEN: "a".repeat(32),
};

describe("loadDashboardConfig", () => {
  it("returns trimmed server configuration", () => {
    expect(
      loadDashboardConfig({
        PORTFOLIO_METRICS_API_URL: ` ${validEnvironment.PORTFOLIO_METRICS_API_URL} `,
        ANALYTICS_ADMIN_TOKEN: ` ${validEnvironment.ANALYTICS_ADMIN_TOKEN} `,
      }),
    ).toEqual({
      metricsApiUrl: validEnvironment.PORTFOLIO_METRICS_API_URL,
      adminToken: validEnvironment.ANALYTICS_ADMIN_TOKEN,
    });
  });

  it("allows an HTTP loopback URL for local development", () => {
    expect(
      loadDashboardConfig({
        ...validEnvironment,
        PORTFOLIO_METRICS_API_URL: "http://127.0.0.1:3000/api/metrics",
      }).metricsApiUrl,
    ).toBe("http://127.0.0.1:3000/api/metrics");
  });

  it("reports every missing variable without including secret values", () => {
    expect(() => loadDashboardConfig({})).toThrowError(
      new DashboardConfigurationError(
        "Missing dashboard environment variables: PORTFOLIO_METRICS_API_URL, ANALYTICS_ADMIN_TOKEN",
      ),
    );
  });

  it.each([
    [
      { ...validEnvironment, PORTFOLIO_METRICS_API_URL: "not-a-url" },
      "PORTFOLIO_METRICS_API_URL must be a valid URL",
    ],
    [
      { ...validEnvironment, PORTFOLIO_METRICS_API_URL: "http://example.com/api/metrics" },
      "PORTFOLIO_METRICS_API_URL must use HTTPS, except for local development",
    ],
    [
      {
        ...validEnvironment,
        PORTFOLIO_METRICS_API_URL: "https://user:pass@example.com/api/metrics?token=secret",
      },
      "PORTFOLIO_METRICS_API_URL cannot contain credentials, a query, or a fragment",
    ],
  ])("rejects an unsafe metrics URL", (environment, message) => {
    expect(() => loadDashboardConfig(environment)).toThrowError(message);
  });

  it("requires a strong admin token", () => {
    expect(() =>
      loadDashboardConfig({ ...validEnvironment, ANALYTICS_ADMIN_TOKEN: "short" }),
    ).toThrowError("ANALYTICS_ADMIN_TOKEN must contain at least 32 characters");
  });
});
