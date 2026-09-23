/** Verifies canonical portfolio URLs. */
import { describe, expect, it } from "vitest";

import {
  navigationIdFromPathname,
  portfolioHref,
} from "./portfolio-navigation";

describe("portfolio navigation", () => {
  it.each([
    ["home", "/"],
    ["about", "/about"],
    ["experience", "/experience"],
    ["projects", "/projects"],
    ["resume", "/resume"],
  ] as const)("maps %s to its canonical route", (page, path) => {
    expect(portfolioHref(page)).toBe(path);
    expect(navigationIdFromPathname(path)).toBe(page);
    if (path !== "/") expect(navigationIdFromPathname(`${path}/`)).toBe(page);
  });

  it("does not select navigation for unrelated paths", () => {
    expect(navigationIdFromPathname("/missing")).toBeNull();
  });
});
