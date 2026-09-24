/** Loads and renders owner-only portfolio analytics from the existing metrics API. */
import { DateRangeForm } from "@/components/date-range-form";
import { MetricsDashboard } from "@/components/metrics-dashboard";
import {
  resolveDashboardDateRange,
  type DashboardSearchParams,
} from "@/lib/date-range";
import {
  DashboardMetricsError,
  fetchAnalyticsMetrics,
  type DashboardMetricsErrorCode,
} from "@/lib/metrics-client";
import { buildMetricsViewModel } from "@/lib/metrics-view-model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DashboardPageProps {
  searchParams: Promise<DashboardSearchParams>;
}

const errorCopy: Record<DashboardMetricsErrorCode, { title: string; detail: string }> = {
  configuration: {
    title: "Dashboard configuration required",
    detail: "Set PORTFOLIO_METRICS_API_URL and ANALYTICS_ADMIN_TOKEN for this deployment.",
  },
  unauthorized: {
    title: "Metrics authorization failed",
    detail: "The dashboard token does not match the token configured for the portfolio API.",
  },
  invalid_range: {
    title: "The API rejected this date range",
    detail: "Choose a valid UTC range of 365 days or fewer and try again.",
  },
  unavailable: {
    title: "Metrics are temporarily unavailable",
    detail: "The portfolio API could not be reached. No credentials were exposed.",
  },
  invalid_response: {
    title: "The metrics response was not recognized",
    detail: "The dashboard and portfolio API may be running incompatible versions.",
  },
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const dateSelection = resolveDashboardDateRange(await searchParams);
  let metrics;

  try {
    metrics = await fetchAnalyticsMetrics(dateSelection.range);
  } catch (error) {
    const code = error instanceof DashboardMetricsError ? error.code : "unavailable";
    const copy = errorCopy[code];

    return (
      <main className="dashboard-shell">
        <DashboardHeader />
        <DateRangeForm error={dateSelection.error} range={dateSelection.range} />
        <section className="error-panel" role="alert">
          <span>Unable to load</span>
          <h2>{copy.title}</h2>
          <p>{copy.detail}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <DashboardHeader />
      <DateRangeForm error={dateSelection.error} range={dateSelection.range} />
      <MetricsDashboard
        generatedAt={new Date().toISOString()}
        range={dateSelection.range}
        viewModel={buildMetricsViewModel(metrics)}
      />
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div>
        <p className="brand-line"><span aria-hidden="true">忍</span> Hien Hoang</p>
        <p className="eyebrow">Private portfolio intelligence</p>
        <h1>Analytics,<br /><em>without the noise.</em></h1>
      </div>
      <div className="privacy-badge">
        <span aria-hidden="true" />
        Owner view
      </div>
    </header>
  );
}
