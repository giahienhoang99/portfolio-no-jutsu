/** Verifies that the repository's portfolio JSON satisfies its public contracts. */
import { describe, expect, it } from "vitest";
import { portfolioConfig } from "./portfolio-config";

describe("portfolioConfig", () => {
  it("contains a valid hosted resume configuration", () => {
    expect(portfolioConfig.resume).toEqual({
      pdfPath: "/resume/hien-hoang-resume.pdf",
      downloadFileName: "Hien-Hoang-Resume.pdf",
    });
  });

  it("contains a valid, fully defaulted analytics configuration", () => {
    expect(portfolioConfig.analytics).toEqual({
      enabled: true,
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
