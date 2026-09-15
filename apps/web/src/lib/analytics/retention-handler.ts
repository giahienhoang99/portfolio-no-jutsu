/** Implements authenticated, bounded cleanup of expired analytics data. */
import { hasValidBearerToken } from "./private-auth";
import type { AnalyticsStore, DeleteExpiredDataResult } from "./store";

const DAY_MS = 24 * 60 * 60 * 1_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
export const RETENTION_BATCH_SIZE = 500;
export const RETENTION_MAX_BATCHES = 10;

export type AnalyticsRetentionRuntime =
  | { enabled: false }
  | {
      enabled: true;
      cronSecret: string;
      retentionDays: number;
      store: AnalyticsStore;
    };

export interface RetentionRouteDependencies {
  getRuntime: () => AnalyticsRetentionRuntime;
  now?: () => number;
}

function responseHeaders(headers?: HeadersInit): HeadersInit {
  return { "Cache-Control": "no-store", ...headers };
}

function errorResponse(status: 401 | 503, code: string): Response {
  return Response.json(
    { error: code },
    {
      status,
      headers: responseHeaders(status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined),
    },
  );
}

function addDeleted(total: DeleteExpiredDataResult, batch: DeleteExpiredDataResult): void {
  total.events += batch.events;
  total.sessions += batch.sessions;
  total.rateLimits += batch.rateLimits;
}

function batchMayHaveMore(batch: DeleteExpiredDataResult): boolean {
  return batch.events === RETENTION_BATCH_SIZE
    || batch.sessions === RETENTION_BATCH_SIZE
    || batch.rateLimits === RETENTION_BATCH_SIZE;
}

/** Creates the Vercel cron GET handler with injectable time and runtime dependencies. */
export function createRetentionRouteHandler(dependencies: RetentionRouteDependencies) {
  const now = dependencies.now ?? Date.now;

  return async function GET(request: Request): Promise<Response> {
    let runtime: AnalyticsRetentionRuntime;
    try {
      runtime = dependencies.getRuntime();
    } catch {
      return errorResponse(503, "analytics_unavailable");
    }

    if (!runtime.enabled) return errorResponse(503, "analytics_unavailable");
    if (!hasValidBearerToken(request, runtime.cronSecret)) return errorResponse(401, "unauthorized");

    const timestamp = now();
    const cutoffs = {
      eventsBefore: timestamp - runtime.retentionDays * DAY_MS,
      sessionsBefore: timestamp,
      rateLimitsBefore: Math.floor(timestamp / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS,
    };
    const deleted: DeleteExpiredDataResult = { events: 0, sessions: 0, rateLimits: 0 };
    let batches = 0;
    let hasMore = false;

    try {
      do {
        const batch = await runtime.store.deleteExpiredData({
          ...cutoffs,
          limit: RETENTION_BATCH_SIZE,
        });
        batches += 1;
        addDeleted(deleted, batch);
        hasMore = batchMayHaveMore(batch);
      } while (hasMore && batches < RETENTION_MAX_BATCHES);

      return Response.json(
        { deleted, batches, complete: !hasMore },
        { headers: responseHeaders() },
      );
    } catch {
      return errorResponse(503, "analytics_unavailable");
    }
  };
}
