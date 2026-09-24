/** Validates server-only configuration for the private analytics dashboard. */
export type DashboardEnvironment = Record<string, string | undefined>;

export interface DashboardConfig {
  adminToken: string;
  metricsApiUrl: string;
}

export class DashboardConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardConfigurationError";
  }
}

function parseMetricsApiUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new DashboardConfigurationError("PORTFOLIO_METRICS_API_URL must be a valid URL");
  }

  const localHostname = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHostname)) {
    throw new DashboardConfigurationError(
      "PORTFOLIO_METRICS_API_URL must use HTTPS, except for local development",
    );
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new DashboardConfigurationError(
      "PORTFOLIO_METRICS_API_URL cannot contain credentials, a query, or a fragment",
    );
  }

  return url.toString();
}

/** Returns a complete configuration without exposing either value to client code. */
export function loadDashboardConfig(
  environment: DashboardEnvironment = process.env,
): DashboardConfig {
  const metricsApiUrl = environment.PORTFOLIO_METRICS_API_URL?.trim();
  const adminToken = environment.ANALYTICS_ADMIN_TOKEN?.trim();
  if (!metricsApiUrl || !adminToken) {
    const missing = [
      !metricsApiUrl ? "PORTFOLIO_METRICS_API_URL" : null,
      !adminToken ? "ANALYTICS_ADMIN_TOKEN" : null,
    ].filter((name): name is string => Boolean(name));
    throw new DashboardConfigurationError(
      `Missing dashboard environment variables: ${missing.join(", ")}`,
    );
  }

  if (adminToken.length < 32) {
    throw new DashboardConfigurationError(
      "ANALYTICS_ADMIN_TOKEN must contain at least 32 characters",
    );
  }

  return {
    metricsApiUrl: parseMetricsApiUrl(metricsApiUrl),
    adminToken,
  };
}
