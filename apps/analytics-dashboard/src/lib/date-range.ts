/** Resolves and validates the dashboard's UTC date-range filters. */
import {
  analyticsDateRangeSchema,
  type AnalyticsDateRange,
} from "@portfolio-no-jutsu/contracts";

const DAY_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_DASHBOARD_RANGE_DAYS = 30;
export const MAX_DASHBOARD_RANGE_DAYS = 365;

type SearchValue = string | string[] | undefined;
export type DashboardSearchParams = Record<string, SearchValue>;

export interface DashboardDateRangeResult {
  error?: string;
  range: AnalyticsDateRange;
}

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Returns an inclusive trailing UTC range ending on the supplied instant. */
export function defaultDashboardDateRange(now = Date.now()): AnalyticsDateRange {
  const currentDay = Date.parse(`${utcDay(now)}T00:00:00.000Z`);
  return {
    from: utcDay(currentDay - (DEFAULT_DASHBOARD_RANGE_DAYS - 1) * DAY_MS),
    to: utcDay(currentDay),
  };
}

function oneValue(value: SearchValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Resolves URL filters, falling back to the default range with a safe error. */
export function resolveDashboardDateRange(
  searchParams: DashboardSearchParams,
  now = Date.now(),
): DashboardDateRangeResult {
  const fallback = defaultDashboardDateRange(now);
  const from = oneValue(searchParams.from);
  const to = oneValue(searchParams.to);

  if (from === undefined && to === undefined) return { range: fallback };

  const parsed = analyticsDateRangeSchema.safeParse({ from, to });
  if (!parsed.success) {
    return { range: fallback, error: "Choose a valid start and end date." };
  }

  const fromTimestamp = Date.parse(`${parsed.data.from}T00:00:00.000Z`);
  const toTimestamp = Date.parse(`${parsed.data.to}T00:00:00.000Z`);
  const inclusiveDays = (toTimestamp - fromTimestamp) / DAY_MS + 1;
  if (inclusiveDays > MAX_DASHBOARD_RANGE_DAYS) {
    return {
      range: fallback,
      error: `Choose a range of ${MAX_DASHBOARD_RANGE_DAYS} days or fewer.`,
    };
  }

  return { range: parsed.data };
}
