/** Verifies authenticated, uncached server requests to the portfolio metrics API. */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DashboardMetricsError,
  fetchAnalyticsMetrics,
} from "./metrics-client";

const environment = {
  PORTFOLIO_METRICS_API_URL: "https://portfolio.example/api/metrics",
  ANALYTICS_ADMIN_TOKEN: "a".repeat(32),
};
const range = { from: "2026-09-01", to: "2026-09-02" };
const validResponse = {
  ...range,
  days: [
    {
      date: "2026-09-01",
      visits: 4,
      estimatedUniqueVisitors: 3,
      resumeViews: 2,
      resumeDownloads: 1,
    },
  ],
};

describe("fetchAnalyticsMetrics", () => {
  it("sends an authenticated, uncached request and validates the response", async () => {
    const fetchMock = vi.fn(async (_input: string | URL, _init?: RequestInit) =>
      Response.json(validResponse),
    );

    await expect(
      fetchAnalyticsMetrics(range, { environment, fetch: fetchMock }),
    ).resolves.toEqual(validResponse);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://portfolio.example/api/metrics?from=2026-09-01&to=2026-09-02",
    );
    expect(init).toEqual({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${environment.ANALYTICS_ADMIN_TOKEN}`,
      },
    });
  });

  it.each([
    [401, "unauthorized"],
    [400, "invalid_range"],
    [503, "unavailable"],
  ] as const)("maps HTTP %s to %s", async (status, code) => {
    const fetchMock = vi.fn(async () => new Response(null, { status }));

    await expect(
      fetchAnalyticsMetrics(range, { environment, fetch: fetchMock }),
    ).rejects.toEqual(new DashboardMetricsError(code));
  });

  it("contains missing configuration and network failures", async () => {
    await expect(
      fetchAnalyticsMetrics(range, { environment: {} }),
    ).rejects.toEqual(new DashboardMetricsError("configuration"));
    await expect(
      fetchAnalyticsMetrics(range, {
        environment,
        fetch: vi.fn(async () => {
          throw new Error("network detail");
        }),
      }),
    ).rejects.toEqual(new DashboardMetricsError("unavailable"));
  });

  it.each([
    new Response("not json"),
    Response.json({ ...validResponse, from: "2026-08-01" }),
    Response.json({ ...validResponse, days: [{ date: "invalid" }] }),
  ])("rejects malformed or mismatched API responses", async (response) => {
    await expect(
      fetchAnalyticsMetrics(range, {
        environment,
        fetch: vi.fn(async () => response.clone()),
      }),
    ).rejects.toEqual(new DashboardMetricsError("invalid_response"));
  });
});
