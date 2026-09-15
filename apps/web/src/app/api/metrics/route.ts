/** Exposes authenticated daily analytics summaries for future dashboards and tools. */
import { getAnalyticsRuntime } from "@/lib/analytics/analytics-runtime";
import { createMetricsRouteHandler } from "@/lib/analytics/metrics-handler";

export const runtime = "nodejs";

export const GET = createMetricsRouteHandler({
  getRuntime: () => {
    const analytics = getAnalyticsRuntime();
    if (!analytics.enabled) return analytics;
    return {
      enabled: true,
      adminToken: analytics.serverConfig.adminToken,
      metrics: analytics.publicConfig.metrics,
      store: analytics.store,
    };
  },
});
