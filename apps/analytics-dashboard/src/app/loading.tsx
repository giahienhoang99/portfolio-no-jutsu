/** Shows the dashboard shell while server metrics are loading. */
export default function Loading() {
  return (
    <main className="dashboard-shell">
      <div className="loading-panel" role="status">
        <span className="loading-pulse" aria-hidden="true" />
        Loading private analytics…
      </div>
    </main>
  );
}
