/** Defines shared runtime schemas and inferred TypeScript types for portfolio analytics. */
import { z } from "zod";

export const ANALYTICS_EVENT_NAMES = ["visit", "resume_view", "resume_download"] as const;

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENT_NAMES);

export const analyticsRouteSchema = z
  .string()
  .min(1, "Route is required")
  .max(256, "Route must be 256 characters or fewer")
  .refine((route) => route === route.trim(), "Route cannot have surrounding whitespace")
  .refine(
    (route) => route.startsWith("/") && !route.startsWith("//"),
    "Route must be an internal absolute path",
  )
  .refine((route) => !route.includes("?") && !route.includes("#"), "Route cannot include a query or fragment");

export const analyticsEventRequestSchema = z.strictObject({
  name: analyticsEventNameSchema,
  route: analyticsRouteSchema,
});

export const analyticsMetricTogglesSchema = z
  .strictObject({
    dailyVisits: z.boolean().default(true),
    dailyUniqueVisitors: z.boolean().default(true),
    resumeViews: z.boolean().default(true),
    resumeDownloads: z.boolean().default(true),
  })
  .default({
    dailyVisits: true,
    dailyUniqueVisitors: true,
    resumeViews: true,
    resumeDownloads: true,
  });

export const analyticsPublicConfigSchema = z.strictObject({
  enabled: z.boolean().default(false),
  retentionDays: z.number().int().min(1).max(365).default(60),
  refreshIntervalSeconds: z.number().int().min(5).max(3600).default(15),
  sessionTimeoutMinutes: z.number().int().min(1).max(1440).default(30),
  metrics: analyticsMetricTogglesSchema,
});

/**
 * Determines whether a string is a real calendar date in strict ISO `YYYY-MM-DD` form.
 *
 * @param value - Candidate date string to validate in UTC.
 * @returns `true` when the value is a valid ISO calendar date; otherwise `false`.
 */
function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export const analyticsDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine(isIsoDate, "Date must be a real UTC calendar date");

export const analyticsDateRangeSchema = z
  .strictObject({
    from: analyticsDateSchema,
    to: analyticsDateSchema,
  })
  .refine(({ from, to }) => from <= to, {
    message: "The from date must be on or before the to date",
    path: ["from"],
  });

export const analyticsDailyMetricsSchema = z.strictObject({
  date: analyticsDateSchema,
  visits: z.number().int().nonnegative().optional(),
  estimatedUniqueVisitors: z.number().int().nonnegative().optional(),
  resumeViews: z.number().int().nonnegative().optional(),
  resumeDownloads: z.number().int().nonnegative().optional(),
});

export const analyticsMetricsResponseSchema = z.strictObject({
  from: analyticsDateSchema,
  to: analyticsDateSchema,
  days: z.array(analyticsDailyMetricsSchema),
});

export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;
export type AnalyticsEventRequest = z.infer<typeof analyticsEventRequestSchema>;
export type AnalyticsMetricToggles = z.infer<typeof analyticsMetricTogglesSchema>;
export type AnalyticsPublicConfig = z.infer<typeof analyticsPublicConfigSchema>;
export type AnalyticsDateRange = z.infer<typeof analyticsDateRangeSchema>;
export type AnalyticsDailyMetrics = z.infer<typeof analyticsDailyMetricsSchema>;
export type AnalyticsMetricsResponse = z.infer<typeof analyticsMetricsResponseSchema>;
