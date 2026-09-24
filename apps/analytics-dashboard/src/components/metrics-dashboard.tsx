/** Presents aggregate cards, daily traffic bars, and an accessible metrics table. */
import type { AnalyticsDateRange } from "@portfolio-no-jutsu/contracts";

import {
  METRIC_DEFINITIONS,
  type CompleteDailyMetrics,
  type MetricsViewModel,
} from "@/lib/metrics-view-model";

interface MetricsDashboardProps {
  generatedAt: string;
  range: AnalyticsDateRange;
  viewModel: MetricsViewModel;
}

const numberFormatter = new Intl.NumberFormat("en-US");
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function parseUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function TrafficChart({ days }: { days: CompleteDailyMetrics[] }) {
  const maxValue = Math.max(
    1,
    ...days.flatMap((day) => [day.visits, day.estimatedUniqueVisitors]),
  );
  const labelInterval = Math.max(1, Math.ceil(days.length / 6));

  return (
    <section className="panel traffic-panel" aria-labelledby="traffic-heading">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Daily traffic</p>
          <h2 id="traffic-heading">Visits and visitors</h2>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-visits" /> Visits</span>
          <span><i className="legend-visitors" /> Estimated visitors</span>
        </div>
      </div>
      <div
        className="traffic-chart"
        role="img"
        aria-label="Daily visits and estimated unique visitors for the selected UTC date range"
      >
        <div className="chart-baseline" aria-hidden="true" />
        <div
          className="chart-columns"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(18px, 1fr))` }}
        >
          {days.map((day, index) => (
            <div className="chart-day" key={day.date}>
              <div className="bar-pair" title={`${longDateFormatter.format(parseUtcDate(day.date))}: ${day.visits} visits, ${day.estimatedUniqueVisitors} estimated visitors`}>
                <span
                  className="chart-bar bar-visits"
                  style={{ height: `${(day.visits / maxValue) * 100}%` }}
                />
                <span
                  className="chart-bar bar-visitors"
                  style={{ height: `${(day.estimatedUniqueVisitors / maxValue) * 100}%` }}
                />
              </div>
              <span className="chart-label">
                {index % labelInterval === 0 || index === days.length - 1
                  ? shortDateFormatter.format(parseUtcDate(day.date))
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Renders the successful analytics result for the chosen date range. */
export function MetricsDashboard({ generatedAt, range, viewModel }: MetricsDashboardProps) {
  const hasActivity = Object.values(viewModel.totals).some((value) => value > 0);

  return (
    <>
      <section className="metric-grid" aria-label="Metric totals">
        {METRIC_DEFINITIONS.map((metric, index) => (
          <article className="metric-card" data-accent={index + 1} key={metric.key}>
            <div className="metric-card-top">
              <span className="metric-index">0{index + 1}</span>
              <span className="metric-mark" aria-hidden="true" />
            </div>
            <strong>{numberFormatter.format(viewModel.totals[metric.key])}</strong>
            <p>{metric.label}</p>
          </article>
        ))}
      </section>

      {!hasActivity && (
        <div className="empty-notice" role="status">
          No analytics activity was recorded in this date range.
        </div>
      )}

      <TrafficChart days={viewModel.days} />

      <section className="panel table-panel" aria-labelledby="daily-heading">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">UTC ledger</p>
            <h2 id="daily-heading">Daily metrics</h2>
          </div>
          <p className="range-summary">{range.from} → {range.to}</p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {METRIC_DEFINITIONS.map((metric) => (
                  <th scope="col" key={metric.key}>{metric.shortLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...viewModel.days].reverse().map((day) => (
                <tr key={day.date}>
                  <th scope="row">{longDateFormatter.format(parseUtcDate(day.date))}</th>
                  {METRIC_DEFINITIONS.map((metric) => (
                    <td key={metric.key}>{numberFormatter.format(day[metric.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="refresh-note">
        Server-fetched at {new Date(generatedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
      </p>
    </>
  );
}
