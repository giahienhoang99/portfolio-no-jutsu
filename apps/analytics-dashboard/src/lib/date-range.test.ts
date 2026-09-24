/** Verifies dashboard defaults and URL-filter validation. */
import { describe, expect, it } from "vitest";

import {
  defaultDashboardDateRange,
  resolveDashboardDateRange,
} from "./date-range";

const now = Date.parse("2026-09-24T19:45:00.000Z");

describe("dashboard date ranges", () => {
  it("defaults to the latest 30 inclusive UTC days", () => {
    expect(defaultDashboardDateRange(now)).toEqual({
      from: "2026-08-26",
      to: "2026-09-24",
    });
    expect(resolveDashboardDateRange({}, now)).toEqual({
      range: { from: "2026-08-26", to: "2026-09-24" },
    });
  });

  it("accepts a valid custom range", () => {
    expect(
      resolveDashboardDateRange(
        { from: "2026-09-01", to: "2026-09-15" },
        now,
      ),
    ).toEqual({ range: { from: "2026-09-01", to: "2026-09-15" } });
  });

  it.each([
    { from: "2026-09-01" },
    { from: ["2026-09-01", "2026-09-02"], to: "2026-09-03" },
    { from: "2026-09-15", to: "2026-09-01" },
    { from: "2026-02-30", to: "2026-03-01" },
  ])("falls back when filters are invalid", (searchParams) => {
    expect(resolveDashboardDateRange(searchParams, now)).toEqual({
      range: { from: "2026-08-26", to: "2026-09-24" },
      error: "Choose a valid start and end date.",
    });
  });

  it("rejects a range longer than the API maximum", () => {
    expect(
      resolveDashboardDateRange(
        { from: "2025-09-24", to: "2026-09-24" },
        now,
      ),
    ).toEqual({
      range: { from: "2026-08-26", to: "2026-09-24" },
      error: "Choose a range of 365 days or fewer.",
    });
  });

  it("accepts an inclusive range of exactly 365 days", () => {
    expect(
      resolveDashboardDateRange(
        { from: "2025-09-25", to: "2026-09-24" },
        now,
      ),
    ).toEqual({ range: { from: "2025-09-25", to: "2026-09-24" } });
  });
});
