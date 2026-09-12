/** Verifies that the invisible reporter forwards the current route to analytics. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/projects",
  report: vi.fn(async () => undefined),
  createAnalyticsClient: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: (effect: () => void) => effect(),
  useMemo: <T>(factory: () => T) => factory(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/analytics/client", () => ({
  createAnalyticsClient: (options: { enabled: boolean }) => {
    mocks.createAnalyticsClient(options);
    return { report: mocks.report };
  },
}));

import { AnalyticsVisitReporter } from "./analytics-visit-reporter";

describe("AnalyticsVisitReporter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports the current pathname with the configured enablement", () => {
    expect(AnalyticsVisitReporter({ enabled: true })).toBeNull();

    expect(mocks.createAnalyticsClient).toHaveBeenCalledWith({ enabled: true });
    expect(mocks.report).toHaveBeenCalledWith({ name: "visit", route: "/projects" });
  });
});
