/** Defines canonical paths for portfolio navigation. */
export type PortfolioPageId = "home" | "about" | "experience" | "projects";
export type NavigationId = PortfolioPageId | "resume";

const PATHS: Record<NavigationId, string> = {
  home: "/",
  about: "/about",
  experience: "/experience",
  projects: "/projects",
  resume: "/resume",
};

/** Returns the canonical path for a portfolio navigation item. */
export function portfolioHref(page: NavigationId): string {
  return PATHS[page];
}

/** Resolves the active navigation item for an exact portfolio pathname. */
export function navigationIdFromPathname(pathname: string): NavigationId | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const match = Object.entries(PATHS).find(([, path]) => path === normalized);
  return (match?.[0] as NavigationId | undefined) ?? null;
}
