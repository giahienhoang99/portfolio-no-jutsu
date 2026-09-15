/** Verifies authentication, range validation, aggregation, and metric visibility. */
import { describe, expect, it, vi } from "vitest";

import { createMetricsRouteHandler, MAX_METRICS_RANGE_DAYS, type AnalyticsMetricsRuntime } from "./metrics-handler";
import type { AnalyticsStore } from "./store";

const adminToken = "a".repeat(32);
const allMetrics = {
  dailyVisits: true,
  dailyUniqueVisitors: true,
  resumeViews: true,
  resumeDownloads: true,
};

function createStore(overrides: Partial<AnalyticsStore> = {}): AnalyticsStore {
  return {
    recordVisit: vi.fn(async () => ({ recorded: true })),
    recordEngagement: vi.fn(async () => undefined),
    consumeRateLimitSlot: vi.fn(async () => ({ allowed: true, count: 1 })),
    readSummaries: vi.fn(async () => []),
    deleteExpiredData: vi.fn(async () => ({ events: 0, sessions: 0, rateLimits: 0 })),
    ...overrides,
  };
}

function enabledRuntime(store: AnalyticsStore, overrides: Partial<Extract<AnalyticsMetricsRuntime, { enabled: true }>> = {}): AnalyticsMetricsRuntime {
  return { enabled: true, adminToken, metrics: allMetrics, store, ...overrides };
}

function request(query = "?from=2026-09-01&to=2026-09-02", authorization?: string): Request {
  return new Request(`https://portfolio.example/api/metrics${query}`, {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("analytics metrics handler", () => {
  it.each([
    undefined,
    "Basic credentials",
    "Bearer",
    "Bearer wrong-token",
    `Bearer ${"b".repeat(32)}`,
  ])("rejects missing or invalid credentials", async (authorization) => {
    const store = createStore();
    const GET = createMetricsRouteHandler({ getRuntime: () => enabledRuntime(store) });

    const response = await GET(request(undefined, authorization));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(store.readSummaries).not.toHaveBeenCalled();
  });

  it("returns daily summaries using the documented response schema", async () => {
    const store = createStore({
      readSummaries: vi.fn(async () => [
        { day: "2026-09-01", visits: 4, estimatedUniqueVisitors: 3, resumeViews: 2, resumeDownloads: 1 },
        { day: "2026-09-02", visits: 1, estimatedUniqueVisitors: 1, resumeViews: 0, resumeDownloads: 0 },
      ]),
    });
    const GET = createMetricsRouteHandler({ getRuntime: () => enabledRuntime(store) });

    const response = await GET(request(undefined, `Bearer ${adminToken}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      from: "2026-09-01",
      to: "2026-09-02",
      days: [
        { date: "2026-09-01", visits: 4, estimatedUniqueVisitors: 3, resumeViews: 2, resumeDownloads: 1 },
        { date: "2026-09-02", visits: 1, estimatedUniqueVisitors: 1, resumeViews: 0, resumeDownloads: 0 },
      ],
    });
    expect(store.readSummaries).toHaveBeenCalledWith("2026-09-01", "2026-09-02");
  });

  it("returns an empty days array when the database has no events in range", async () => {
    const GET = createMetricsRouteHandler({ getRuntime: () => enabledRuntime(createStore()) });

    const response = await GET(request("?from=2026-09-01&to=2026-09-01", `bearer ${adminToken}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ from: "2026-09-01", to: "2026-09-01", days: [] });
  });

  it("omits metrics disabled by public configuration", async () => {
    const store = createStore({
      readSummaries: vi.fn(async () => [
        { day: "2026-09-01", visits: 4, estimatedUniqueVisitors: 3, resumeViews: 2, resumeDownloads: 1 },
      ]),
    });
    const GET = createMetricsRouteHandler({
      getRuntime: () => enabledRuntime(store, {
        metrics: {
          dailyVisits: false,
          dailyUniqueVisitors: true,
          resumeViews: false,
          resumeDownloads: true,
        },
      }),
    });

    const response = await GET(request("?from=2026-09-01&to=2026-09-01", `Bearer ${adminToken}`));

    expect(await response.json()).toEqual({
      from: "2026-09-01",
      to: "2026-09-01",
      days: [{ date: "2026-09-01", estimatedUniqueVisitors: 3, resumeDownloads: 1 }],
    });
  });

  it.each([
    "",
    "?from=2026-09-01",
    "?from=2026-09-02&to=2026-09-01",
    "?from=2026-02-30&to=2026-03-01",
    "?from=2026-09-01&from=2026-09-02&to=2026-09-03",
    "?from=2026-09-01&to=2026-09-02&extra=true",
    "?from=2025-09-01&to=2026-09-01",
  ])("rejects an invalid or overlong date range: %s", async (query) => {
    const store = createStore();
    const GET = createMetricsRouteHandler({ getRuntime: () => enabledRuntime(store) });

    const response = await GET(request(query, `Bearer ${adminToken}`));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_date_range" });
    expect(store.readSummaries).not.toHaveBeenCalled();
  });

  it(`accepts a range of exactly ${MAX_METRICS_RANGE_DAYS} days`, async () => {
    const store = createStore();
    const GET = createMetricsRouteHandler({ getRuntime: () => enabledRuntime(store) });

    const response = await GET(request("?from=2025-09-02&to=2026-09-01", `Bearer ${adminToken}`));

    expect(response.status).toBe(200);
    expect(store.readSummaries).toHaveBeenCalled();
  });

  it("contains disabled, configuration, storage, and malformed-summary failures", async () => {
    const disabled = createMetricsRouteHandler({ getRuntime: () => ({ enabled: false }) });
    const brokenRuntime = createMetricsRouteHandler({ getRuntime: () => { throw new Error("configuration"); } });
    const brokenStore = createMetricsRouteHandler({
      getRuntime: () => enabledRuntime(createStore({ readSummaries: vi.fn(async () => { throw new Error("database"); }) })),
    });
    const malformedStore = createMetricsRouteHandler({
      getRuntime: () => enabledRuntime(createStore({
        readSummaries: vi.fn(async () => [
          { day: "invalid", visits: 0, estimatedUniqueVisitors: 0, resumeViews: 0, resumeDownloads: 0 },
        ]),
      })),
    });
    const authorized = request(undefined, `Bearer ${adminToken}`);

    for (const GET of [disabled, brokenRuntime, brokenStore, malformedStore]) {
      const response = await GET(authorized.clone());
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "analytics_unavailable" });
    }
  });
});
