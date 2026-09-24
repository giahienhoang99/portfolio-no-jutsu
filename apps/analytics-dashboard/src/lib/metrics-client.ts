/** Retrieves authenticated aggregate metrics without exposing credentials to the browser. */
import "server-only";

import {
  analyticsMetricsResponseSchema,
  type AnalyticsDateRange,
  type AnalyticsMetricsResponse,
} from "@portfolio-no-jutsu/contracts";

import { DashboardConfigurationError, loadDashboardConfig } from "./dashboard-config";

type MetricsFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type DashboardMetricsErrorCode =
  | "configuration"
  | "unauthorized"
  | "invalid_range"
  | "unavailable"
  | "invalid_response";

export class DashboardMetricsError extends Error {
  constructor(readonly code: DashboardMetricsErrorCode) {
    super(code);
    this.name = "DashboardMetricsError";
  }
}

function errorForStatus(status: number): DashboardMetricsError {
  if (status === 401) return new DashboardMetricsError("unauthorized");
  if (status === 400) return new DashboardMetricsError("invalid_range");
  return new DashboardMetricsError("unavailable");
}

/** Calls the existing portfolio metrics API from the Next.js server. */
export async function fetchAnalyticsMetrics(
  range: AnalyticsDateRange,
  options: {
    environment?: Record<string, string | undefined>;
    fetch?: MetricsFetch;
  } = {},
): Promise<AnalyticsMetricsResponse> {
  let config;
  try {
    config = loadDashboardConfig(options.environment);
  } catch (error) {
    if (error instanceof DashboardConfigurationError) {
      throw new DashboardMetricsError("configuration");
    }
    throw error;
  }

  const url = new URL(config.metricsApiUrl);
  url.searchParams.set("from", range.from);
  url.searchParams.set("to", range.to);

  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.adminToken}`,
      },
    });
  } catch {
    throw new DashboardMetricsError("unavailable");
  }

  if (!response.ok) throw errorForStatus(response.status);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DashboardMetricsError("invalid_response");
  }

  const parsed = analyticsMetricsResponseSchema.safeParse(body);
  if (
    !parsed.success ||
    parsed.data.from !== range.from ||
    parsed.data.to !== range.to
  ) {
    throw new DashboardMetricsError("invalid_response");
  }

  return parsed.data;
}
