/** Exposes the authenticated daily analytics-retention job to Vercel Cron. */
import { getAnalyticsRuntime } from "@/lib/analytics/analytics-runtime";
import { createRetentionRouteHandler } from "@/lib/analytics/retention-handler";

export const runtime = "nodejs";

export const GET = createRetentionRouteHandler({
  getRuntime: () => {
    const analytics = getAnalyticsRuntime();
    if (!analytics.enabled) return analytics;
    return {
      enabled: true,
      cronSecret: analytics.serverConfig.cronSecret,
      retentionDays: analytics.publicConfig.retentionDays,
      store: analytics.store,
    };
  },
});
