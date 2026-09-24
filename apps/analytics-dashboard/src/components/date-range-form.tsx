/** Renders a progressively enhanced GET form for UTC analytics filtering. */
import type { AnalyticsDateRange } from "@portfolio-no-jutsu/contracts";

interface DateRangeFormProps {
  error?: string;
  range: AnalyticsDateRange;
}

export function DateRangeForm({ error, range }: DateRangeFormProps) {
  return (
    <form className="range-form" method="get">
      <div className="range-fields">
        <label>
          <span>From</span>
          <input defaultValue={range.from} max={range.to} name="from" type="date" />
        </label>
        <span className="range-arrow" aria-hidden="true">→</span>
        <label>
          <span>To</span>
          <input defaultValue={range.to} min={range.from} name="to" type="date" />
        </label>
      </div>
      <button type="submit">Apply range</button>
      {error && <p className="filter-error" role="alert">{error} Showing the latest 30 days instead.</p>}
    </form>
  );
}
