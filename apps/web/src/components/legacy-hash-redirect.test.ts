/** Verifies compatibility redirects from legacy section hashes. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: (effect: () => void) => effect(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

import { LegacyHashRedirect } from "./legacy-hash-redirect";

describe("LegacyHashRedirect", () => {
  beforeEach(() => {
    mocks.pathname = "/";
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("replaces a legacy home hash with its canonical route", () => {
    vi.stubGlobal("window", { location: { hash: "#projects" } });

    expect(LegacyHashRedirect()).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/projects");
  });

  it("ignores unrelated paths and unknown hashes", () => {
    vi.stubGlobal("window", { location: { hash: "#unknown" } });
    LegacyHashRedirect();
    mocks.pathname = "/resume";
    LegacyHashRedirect();

    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
