/** Verifies that the invisible reporter forwards the current route to analytics. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    mocks.pathname = "/projects";
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reports the current pathname with the configured enablement", () => {
    expect(AnalyticsVisitReporter({ enabled: true })).toBeNull();

    expect(mocks.createAnalyticsClient).toHaveBeenCalledWith({ enabled: true });
    expect(mocks.report).toHaveBeenCalledWith({ name: "visit", route: "/projects" });
  });

  it("lets a legacy hash redirect before reporting the home pathname", () => {
    mocks.pathname = "/";
    vi.stubGlobal("window", { location: { hash: "#about" } });

    expect(AnalyticsVisitReporter({ enabled: true })).toBeNull();
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
