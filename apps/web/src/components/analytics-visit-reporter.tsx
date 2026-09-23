/** Reports portfolio route visits without rendering visible UI. */
"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { createAnalyticsClient } from "@/lib/analytics/client";
import { routeFromLegacyHash } from "../lib/portfolio-navigation";

export interface AnalyticsVisitReporterProps {
  enabled: boolean;
}

/** Sends a best-effort visit event on initial load and future URL route changes. */
export function AnalyticsVisitReporter({ enabled }: AnalyticsVisitReporterProps) {
  const pathname = usePathname();
  const analytics = useMemo(() => createAnalyticsClient({ enabled }), [enabled]);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === "/" && routeFromLegacyHash(window.location.hash)) return;
    void analytics.report({ name: "visit", route: pathname });
  }, [analytics, pathname]);

  return null;
}
