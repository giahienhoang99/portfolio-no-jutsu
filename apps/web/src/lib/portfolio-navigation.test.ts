/** Verifies canonical portfolio URLs and compatibility with legacy section hashes. */
import { describe, expect, it } from "vitest";

import {
  navigationIdFromPathname,
  portfolioHref,
  routeFromLegacyHash,
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

  it.each([
    ["#about", "/about"],
    ["experience", "/experience"],
    ["#projects", "/projects"],
  ])("maps the legacy %s hash to %s", (hash, path) => {
    expect(routeFromLegacyHash(hash)).toBe(path);
  });

  it("ignores unknown and empty hashes", () => {
    expect(routeFromLegacyHash("#unknown")).toBeNull();
    expect(routeFromLegacyHash("")).toBeNull();
  });
});
