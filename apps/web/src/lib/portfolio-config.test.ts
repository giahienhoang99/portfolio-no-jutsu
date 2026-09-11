/** Verifies that the repository's portfolio JSON satisfies the public analytics contract. */
import { describe, expect, it } from "vitest";
import { portfolioConfig } from "./portfolio-config";

describe("portfolioConfig", () => {
  it("contains a valid, fully defaulted analytics configuration", () => {
    expect(portfolioConfig.analytics).toEqual({
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
});
