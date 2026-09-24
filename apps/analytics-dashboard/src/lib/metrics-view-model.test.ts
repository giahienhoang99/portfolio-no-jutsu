/** Verifies sparse metrics expansion and dashboard totals. */
import { describe, expect, it } from "vitest";

import { buildMetricsViewModel } from "./metrics-view-model";

describe("buildMetricsViewModel", () => {
  it("fills missing UTC dates and totals every supported metric", () => {
    expect(
      buildMetricsViewModel({
        from: "2026-09-01",
        to: "2026-09-03",
        days: [
          {
            date: "2026-09-01",
            visits: 4,
            estimatedUniqueVisitors: 3,
            resumeViews: 2,
            resumeDownloads: 1,
          },
          {
            date: "2026-09-03",
            visits: 2,
            estimatedUniqueVisitors: 2,
            resumeViews: 1,
          },
        ],
      }),
    ).toEqual({
      days: [
        {
          date: "2026-09-01",
          visits: 4,
          estimatedUniqueVisitors: 3,
          resumeViews: 2,
          resumeDownloads: 1,
        },
        {
          date: "2026-09-02",
          visits: 0,
          estimatedUniqueVisitors: 0,
          resumeViews: 0,
          resumeDownloads: 0,
        },
        {
          date: "2026-09-03",
          visits: 2,
          estimatedUniqueVisitors: 2,
          resumeViews: 1,
          resumeDownloads: 0,
        },
      ],
      totals: {
        visits: 6,
        estimatedUniqueVisitors: 5,
        resumeViews: 3,
        resumeDownloads: 1,
      },
    });
  });

  it("returns zero totals for an empty response range", () => {
    const result = buildMetricsViewModel({
      from: "2026-09-01",
      to: "2026-09-01",
      days: [],
    });

    expect(result.days).toHaveLength(1);
    expect(result.totals).toEqual({
      visits: 0,
      estimatedUniqueVisitors: 0,
      resumeViews: 0,
      resumeDownloads: 0,
    });
  });
});
