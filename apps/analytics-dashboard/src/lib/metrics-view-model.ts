/** Converts sparse daily API results into dashboard totals and complete day rows. */
import type {
  AnalyticsDailyMetrics,
  AnalyticsMetricsResponse,
} from "@portfolio-no-jutsu/contracts";

const DAY_MS = 24 * 60 * 60 * 1_000;

export type MetricKey = Exclude<keyof AnalyticsDailyMetrics, "date">;
export type CompleteDailyMetrics = Required<AnalyticsDailyMetrics>;

export const METRIC_DEFINITIONS: ReadonlyArray<{
  key: MetricKey;
  label: string;
  shortLabel: string;
}> = [
  { key: "visits", label: "Visits", shortLabel: "Visits" },
  {
    key: "estimatedUniqueVisitors",
    label: "Estimated visitors",
    shortLabel: "Visitors",
  },
  { key: "resumeViews", label: "Résumé views", shortLabel: "Views" },
  {
    key: "resumeDownloads",
    label: "Résumé downloads",
    shortLabel: "Downloads",
  },
];

export interface MetricsViewModel {
  days: CompleteDailyMetrics[];
  totals: Record<MetricKey, number>;
}

function zeroDay(date: string): CompleteDailyMetrics {
  return {
    date,
    visits: 0,
    estimatedUniqueVisitors: 0,
    resumeViews: 0,
    resumeDownloads: 0,
  };
}

function eachUtcDay(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  const days: string[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += DAY_MS) {
    days.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return days;
}

/** Fills missing dates with zeroes and calculates totals for summary cards. */
export function buildMetricsViewModel(
  response: AnalyticsMetricsResponse,
): MetricsViewModel {
  const byDate = new Map(response.days.map((day) => [day.date, day]));
  const days = eachUtcDay(response.from, response.to).map((date) => ({
    ...zeroDay(date),
    ...byDate.get(date),
  }));
  const totals = Object.fromEntries(
    METRIC_DEFINITIONS.map(({ key }) => [
      key,
      days.reduce((total, day) => total + day[key], 0),
    ]),
  ) as Record<MetricKey, number>;

  return { days, totals };
}
