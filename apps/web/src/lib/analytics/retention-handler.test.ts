/** Verifies authenticated, bounded, and repeatable analytics retention cleanup. */
import { describe, expect, it, vi } from "vitest";

import { InMemoryAnalyticsStore } from "./in-memory-store";
import {
  createRetentionRouteHandler,
  RETENTION_BATCH_SIZE,
  RETENTION_MAX_BATCHES,
  type AnalyticsRetentionRuntime,
} from "./retention-handler";
import type { AnalyticsStore, DeleteExpiredDataResult } from "./store";

const cronSecret = "c".repeat(32);
const currentTime = Date.UTC(2026, 8, 14, 12, 34, 56);
const retentionDays = 60;

function createStore(overrides: Partial<AnalyticsStore> = {}): AnalyticsStore {
  return {
    recordVisit: vi.fn(async () => ({ recorded: true })),
    recordEngagement: vi.fn(async () => undefined),
    consumeRateLimitSlot: vi.fn(async () => ({ allowed: true, count: 1 })),
    readSummaries: vi.fn(async () => []),
    deleteExpiredData: vi.fn(async () => ({ events: 0, sessions: 0, rateLimits: 0 })),
    ...overrides,
  };
}

function enabledRuntime(store: AnalyticsStore): AnalyticsRetentionRuntime {
  return { enabled: true, cronSecret, retentionDays, store };
}

function request(authorization?: string): Request {
  return new Request("https://portfolio.example/api/cron/analytics-retention", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("analytics retention handler", () => {
  it.each([undefined, "Basic credentials", "Bearer wrong-token"])(
    "rejects missing or invalid cron credentials",
    async (authorization) => {
      const store = createStore();
      const GET = createRetentionRouteHandler({ getRuntime: () => enabledRuntime(store), now: () => currentTime });

      const response = await GET(request(authorization));

      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Bearer");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "unauthorized" });
      expect(store.deleteExpiredData).not.toHaveBeenCalled();
    },
  );

  it("uses exact cutoffs and continues through bounded deletion batches", async () => {
    const deleteExpiredData = vi.fn<AnalyticsStore["deleteExpiredData"]>();
    deleteExpiredData
      .mockResolvedValueOnce({ events: RETENTION_BATCH_SIZE, sessions: 2, rateLimits: 0 })
      .mockResolvedValueOnce({ events: 3, sessions: 0, rateLimits: 0 });
    const store = createStore({ deleteExpiredData });
    const GET = createRetentionRouteHandler({ getRuntime: () => enabledRuntime(store), now: () => currentTime });

    const response = await GET(request(`Bearer ${cronSecret}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      deleted: { events: RETENTION_BATCH_SIZE + 3, sessions: 2, rateLimits: 0 },
      batches: 2,
      complete: true,
    });
    expect(deleteExpiredData).toHaveBeenCalledTimes(2);
    expect(deleteExpiredData).toHaveBeenCalledWith({
      eventsBefore: currentTime - retentionDays * 24 * 60 * 60 * 1_000,
      sessionsBefore: currentTime,
      rateLimitsBefore: Math.floor(currentTime / 60_000) * 60_000,
      limit: RETENTION_BATCH_SIZE,
    });
  });

  it("preserves events at the retention boundary and newer events across repeated calls", async () => {
    const store = new InMemoryAnalyticsStore();
    const cutoff = currentTime - retentionDays * 24 * 60 * 60 * 1_000;
    await store.recordEngagement({ type: "resume_view", occurredAt: cutoff - 1, utcDay: "2026-07-16", route: "/resume", visitorHash: "old" });
    await store.recordEngagement({ type: "resume_view", occurredAt: cutoff, utcDay: "2026-07-16", route: "/resume", visitorHash: "boundary" });
    await store.recordEngagement({ type: "resume_download", occurredAt: cutoff + 1, utcDay: "2026-07-16", route: "/resume", visitorHash: "new" });
    const GET = createRetentionRouteHandler({ getRuntime: () => enabledRuntime(store), now: () => currentTime });

    const firstResponse = await GET(request(`Bearer ${cronSecret}`));
    const secondResponse = await GET(request(`Bearer ${cronSecret}`));

    expect(await firstResponse.json()).toMatchObject({ deleted: { events: 1 }, complete: true });
    expect(await secondResponse.json()).toMatchObject({ deleted: { events: 0 }, complete: true });
    expect(await store.readSummaries("2026-07-16", "2026-07-16")).toEqual([
      { day: "2026-07-16", visits: 0, estimatedUniqueVisitors: 2, resumeViews: 1, resumeDownloads: 1 },
    ]);
  });

  it("stops after the maximum batch count and reports possible remaining work", async () => {
    const fullBatch: DeleteExpiredDataResult = {
      events: RETENTION_BATCH_SIZE,
      sessions: RETENTION_BATCH_SIZE,
      rateLimits: RETENTION_BATCH_SIZE,
    };
    const deleteExpiredData = vi.fn(async () => fullBatch);
    const GET = createRetentionRouteHandler({
      getRuntime: () => enabledRuntime(createStore({ deleteExpiredData })),
      now: () => currentTime,
    });

    const response = await GET(request(`Bearer ${cronSecret}`));

    expect(deleteExpiredData).toHaveBeenCalledTimes(RETENTION_MAX_BATCHES);
    expect(await response.json()).toEqual({
      deleted: {
        events: RETENTION_BATCH_SIZE * RETENTION_MAX_BATCHES,
        sessions: RETENTION_BATCH_SIZE * RETENTION_MAX_BATCHES,
        rateLimits: RETENTION_BATCH_SIZE * RETENTION_MAX_BATCHES,
      },
      batches: RETENTION_MAX_BATCHES,
      complete: false,
    });
  });

  it("contains disabled, configuration, and database failures", async () => {
    const disabled = createRetentionRouteHandler({ getRuntime: () => ({ enabled: false }) });
    const brokenRuntime = createRetentionRouteHandler({ getRuntime: () => { throw new Error("configuration"); } });
    const brokenStore = createRetentionRouteHandler({
      getRuntime: () => enabledRuntime(createStore({
        deleteExpiredData: vi.fn(async () => { throw new Error("database"); }),
      })),
    });

    for (const GET of [disabled, brokenRuntime, brokenStore]) {
      const response = await GET(request(`Bearer ${cronSecret}`));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "analytics_unavailable" });
    }
  });
});
