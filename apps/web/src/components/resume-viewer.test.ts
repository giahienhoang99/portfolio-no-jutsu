/** Verifies resume-view reporting across React development effect replay. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  report: vi.fn(async () => undefined),
  viewer: {} as Element,
}));

vi.mock("react", () => {
  return {
    useEffect: (effect: () => void | (() => void)) => {
      const cleanup = effect();
      cleanup?.();
      effect();
    },
    useMemo: <T>(factory: () => T) => factory(),
    useRef: (initialValue: unknown) => ({ current: initialValue === null ? mocks.viewer : initialValue }),
  };
});

vi.mock("next/link", () => ({ default: "a" }));

vi.mock("@/lib/analytics/client", () => ({
  createAnalyticsClient: () => ({ report: mocks.report }),
}));

vi.mock("@/lib/analytics/resume-view-tracking", () => ({
  startResumeViewTracking: ({ enabled, onVisible }: { enabled: boolean; onVisible: () => void }) => {
    if (enabled) onVisible();
    return () => undefined;
  },
}));

import { ResumeViewer } from "./resume-viewer";

describe("ResumeViewer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports one view when React replays the mounted effect", () => {
    ResumeViewer({
      analyticsEnabled: true,
      downloadFileName: "Hien-Hoang-Resume.pdf",
      pdfPath: "/resume/hien-hoang-resume.pdf",
    });

    expect(mocks.report).toHaveBeenCalledOnce();
    expect(mocks.report).toHaveBeenCalledWith({ name: "resume_view", route: "/resume" });
  });
});
