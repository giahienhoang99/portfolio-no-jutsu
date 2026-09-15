/** Implements the authenticated HTTP boundary for daily analytics summaries. */
import {
  analyticsDateRangeSchema,
  analyticsMetricsResponseSchema,
  type AnalyticsDailyMetrics,
  type AnalyticsMetricToggles,
} from "@portfolio-no-jutsu/contracts";

import { hasValidBearerToken } from "./private-auth";
import type { AnalyticsStore } from "./store";

export const MAX_METRICS_RANGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1_000;

export type AnalyticsMetricsRuntime =
  | { enabled: false }
  | {
      enabled: true;
      adminToken: string;
      metrics: AnalyticsMetricToggles;
      store: AnalyticsStore;
    };

export interface MetricsRouteDependencies {
  getRuntime: () => AnalyticsMetricsRuntime;
}

function responseHeaders(headers?: HeadersInit): HeadersInit {
  return { "Cache-Control": "no-store", ...headers };
}

function errorResponse(status: 400 | 401 | 503, code: string): Response {
  return Response.json(
    { error: code },
    {
      status,
      headers: responseHeaders(status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined),
    },
  );
}

function readDateRange(request: Request): { from: string; to: string } | null {
  const searchParams = new URL(request.url).searchParams;
  const keys = [...searchParams.keys()];
  if (keys.some((key) => key !== "from" && key !== "to")) return null;
  if (searchParams.getAll("from").length !== 1 || searchParams.getAll("to").length !== 1) return null;

  const parsed = analyticsDateRangeSchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });
  if (!parsed.success) return null;

  const fromTimestamp = Date.parse(`${parsed.data.from}T00:00:00.000Z`);
  const toTimestamp = Date.parse(`${parsed.data.to}T00:00:00.000Z`);
  const inclusiveDays = (toTimestamp - fromTimestamp) / DAY_MS + 1;
  return inclusiveDays <= MAX_METRICS_RANGE_DAYS ? parsed.data : null;
}

function applyMetricToggles(
  summary: Awaited<ReturnType<AnalyticsStore["readSummaries"]>>[number],
  metrics: AnalyticsMetricToggles,
): AnalyticsDailyMetrics {
  return {
    date: summary.day,
    ...(metrics.dailyVisits ? { visits: summary.visits } : {}),
    ...(metrics.dailyUniqueVisitors ? { estimatedUniqueVisitors: summary.estimatedUniqueVisitors } : {}),
    ...(metrics.resumeViews ? { resumeViews: summary.resumeViews } : {}),
    ...(metrics.resumeDownloads ? { resumeDownloads: summary.resumeDownloads } : {}),
  };
}

/** Creates the private metrics GET handler with injectable runtime dependencies. */
export function createMetricsRouteHandler(dependencies: MetricsRouteDependencies) {
  return async function GET(request: Request): Promise<Response> {
    let runtime: AnalyticsMetricsRuntime;
    try {
      runtime = dependencies.getRuntime();
    } catch {
      return errorResponse(503, "analytics_unavailable");
    }

    if (!runtime.enabled) return errorResponse(503, "analytics_unavailable");
    if (!hasValidBearerToken(request, runtime.adminToken)) return errorResponse(401, "unauthorized");

    const range = readDateRange(request);
    if (!range) return errorResponse(400, "invalid_date_range");

    try {
      const summaries = await runtime.store.readSummaries(range.from, range.to);
      const response = analyticsMetricsResponseSchema.parse({
        ...range,
        days: summaries.map((summary) => applyMetricToggles(summary, runtime.metrics)),
      });
      return Response.json(response, { headers: responseHeaders() });
    } catch {
      return errorResponse(503, "analytics_unavailable");
    }
  };
}
