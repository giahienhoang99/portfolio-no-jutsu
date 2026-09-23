/** Redirects previously shared hash-section links to canonical portfolio routes. */
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { routeFromLegacyHash } from "../lib/portfolio-navigation";

export function LegacyHashRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    const route = routeFromLegacyHash(window.location.hash);
    if (route) router.replace(route);
  }, [pathname, router]);

  return null;
}
