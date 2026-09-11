/** Exercises the public analytics request, configuration, date-range, and response contracts. */
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENT_NAMES,
  analyticsDateRangeSchema,
  analyticsEventRequestSchema,
  analyticsMetricsResponseSchema,
  analyticsPublicConfigSchema,
} from "./index";

describe("analyticsEventRequestSchema", () => {
  it.each(ANALYTICS_EVENT_NAMES)("accepts the %s event", (name) => {
    expect(analyticsEventRequestSchema.parse({ name, route: "/resume" })).toEqual({ name, route: "/resume" });
  });

  it.each([
    { name: "page_view", route: "/" },
    { name: "visit", route: "https://example.com" },
    { name: "visit", route: "//example.com" },
    { name: "visit", route: "/resume?download=1" },
    { name: "visit", route: "/resume#viewer" },
    { name: "visit", route: " /resume" },
    { name: "visit", route: `/${"a".repeat(256)}` },
    { name: "visit", route: "/", unexpected: true },
  ])("rejects an invalid or untrusted payload", (payload) => {
    expect(() => analyticsEventRequestSchema.parse(payload)).toThrow();
  });
});

describe("analyticsPublicConfigSchema", () => {
  it("applies documented defaults", () => {
    expect(analyticsPublicConfigSchema.parse({ enabled: false })).toEqual({
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
    });
  });

  it.each([
    { enabled: true, retentionDays: 0 },
    { enabled: true, retentionDays: 366 },
    { enabled: true, refreshIntervalSeconds: 4 },
    { enabled: true, sessionTimeoutMinutes: 1441 },
    { enabled: true, metrics: { dailyVisits: true, unknown: true } },
    { enabled: true, unknown: true },
  ])("rejects out-of-range or unknown settings", (config) => {
    expect(() => analyticsPublicConfigSchema.parse(config)).toThrow();
  });
});

describe("analytics date and response schemas", () => {
  it("accepts a valid range and aggregate response", () => {
    expect(analyticsDateRangeSchema.parse({ from: "2026-09-01", to: "2026-09-10" })).toBeTruthy();
    expect(
      analyticsMetricsResponseSchema.parse({
        from: "2026-09-01",
        to: "2026-09-10",
        days: [{ date: "2026-09-01", visits: 2, estimatedUniqueVisitors: 1 }],
      }),
    ).toBeTruthy();
  });

  it.each([
    { from: "2026-09-10", to: "2026-09-01" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "09/01/2026", to: "2026-09-10" },
  ])("rejects an invalid UTC range", (range) => {
    expect(() => analyticsDateRangeSchema.parse(range)).toThrow();
  });

  it("rejects negative aggregate counts and extra response fields", () => {
    expect(() =>
      analyticsMetricsResponseSchema.parse({
        from: "2026-09-01",
        to: "2026-09-01",
        days: [{ date: "2026-09-01", visits: -1 }],
        secret: "not allowed",
      }),
    ).toThrow();
  });
});
