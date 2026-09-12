/** Exercises analytics policy independently from the HTTP and database adapters. */
import { describe, expect, it, vi } from "vitest";

import { InMemoryAnalyticsStore } from "./in-memory-store";
import {
  AnalyticsEventService,
  deriveDailyVisitorHash,
  deriveSessionHash,
  normalizeAnalyticsRoute,
  type AnalyticsEventServiceConfig,
} from "./event-service";
import type { AnalyticsEventInput, AnalyticsStore } from "./store";

const secret = "analytics-hash-secret-for-tests-only";
const sessionId = "s".repeat(43);

function enabledConfig(overrides: Partial<AnalyticsEventServiceConfig> = {}): AnalyticsEventServiceConfig {
  return {
    enabled: true,
    hashSecret: secret,
    sessionTimeoutMinutes: 30,
    metrics: {
      dailyVisits: true,
      dailyUniqueVisitors: true,
      resumeViews: true,
      resumeDownloads: true,
    },
    ...overrides,
  };
}

describe("AnalyticsEventService", () => {
  it("creates, refreshes, and expires visit sessions at the configured boundary", async () => {
    const store = new InMemoryAnalyticsStore();
    let now = Date.UTC(2026, 8, 12, 12);
    const service = new AnalyticsEventService(store, enabledConfig(), {
      now: () => now,
      createSessionId: () => sessionId,
    });

    expect(await service.process({ event: { name: "visit", route: "/" }, visitorAddress: "visitor-address" })).toEqual({
      status: "accepted",
      sessionId,
      sessionMaxAgeSeconds: 1_800,
    });

    now += 10 * 60_000;
    await service.process({ event: { name: "visit", route: "/" }, visitorAddress: "visitor-address", sessionId });
    expect((await store.readSummaries("2026-09-12", "2026-09-12"))[0]?.visits).toBe(1);

    now += 30 * 60_000;
    await service.process({ event: { name: "visit", route: "/" }, visitorAddress: "visitor-address", sessionId });
    expect((await store.readSummaries("2026-09-12", "2026-09-12"))[0]?.visits).toBe(2);
  });

  it("deduplicates concurrent visits sharing a session", async () => {
    const store = new InMemoryAnalyticsStore();
    const service = new AnalyticsEventService(store, enabledConfig(), { now: () => Date.UTC(2026, 8, 12, 12) });
    const input = { event: { name: "visit" as const, route: "/" }, visitorAddress: "visitor-address", sessionId };

    await Promise.all([service.process(input), service.process(input)]);

    expect((await store.readSummaries("2026-09-12", "2026-09-12"))[0]?.visits).toBe(1);
  });

  it("does no persistence work when analytics or a metric is disabled", async () => {
    const store: AnalyticsStore = {
      recordVisit: vi.fn(async () => ({ recorded: true })),
      recordEngagement: vi.fn(async () => undefined),
      consumeRateLimitSlot: vi.fn(async () => ({ allowed: true, count: 1 })),
      readSummaries: vi.fn(async () => []),
      deleteExpiredData: vi.fn(async () => ({ events: 0, sessions: 0, rateLimits: 0 })),
    };
    const disabledService = new AnalyticsEventService(store, enabledConfig({ enabled: false }));
    const disabledMetricService = new AnalyticsEventService(store, enabledConfig({
      metrics: {
        dailyVisits: false,
        dailyUniqueVisitors: false,
        resumeViews: false,
        resumeDownloads: true,
      },
    }));

    await expect(disabledService.process({ event: { name: "visit", route: "/" }, visitorAddress: "visitor-address" })).resolves.toEqual({ status: "ignored" });
    await expect(disabledMetricService.process({ event: { name: "resume_view", route: "/resume" }, visitorAddress: "visitor-address" })).resolves.toEqual({ status: "ignored" });
    expect(store.consumeRateLimitSlot).not.toHaveBeenCalled();
    expect(store.recordVisit).not.toHaveBeenCalled();
    expect(store.recordEngagement).not.toHaveBeenCalled();
  });

  it("records visits when only the unique-visitor metric is enabled", async () => {
    const store = new InMemoryAnalyticsStore();
    const service = new AnalyticsEventService(store, enabledConfig({
      metrics: {
        dailyVisits: false,
        dailyUniqueVisitors: true,
        resumeViews: false,
        resumeDownloads: false,
      },
    }), { now: () => Date.UTC(2026, 8, 12), createSessionId: () => sessionId });

    await service.process({ event: { name: "visit", route: "/" }, visitorAddress: "visitor-address" });
    expect((await store.readSummaries("2026-09-12", "2026-09-12"))[0]).toMatchObject({
      visits: 1,
      estimatedUniqueVisitors: 1,
    });
  });

  it("enforces rate limits and starts a fresh counter in the next fixed window", async () => {
    const store = new InMemoryAnalyticsStore();
    let now = 1_000;
    const service = new AnalyticsEventService(store, enabledConfig({ rateLimit: 2, rateLimitWindowMs: 1_000 }), {
      now: () => now,
      createSessionId: () => sessionId,
    });
    const input = { event: { name: "resume_view" as const, route: "/resume" }, visitorAddress: "visitor-address" };

    await expect(service.process(input)).resolves.toMatchObject({ status: "accepted" });
    await expect(service.process(input)).resolves.toMatchObject({ status: "accepted" });
    await expect(service.process(input)).resolves.toEqual({ status: "rate_limited", retryAfterSeconds: 1 });
    now = 2_000;
    await expect(service.process(input)).resolves.toMatchObject({ status: "accepted" });
  });

  it("rotates visitor hashes by UTC day while keeping session hashes stable", () => {
    const firstDay = deriveDailyVisitorHash(secret, "2026-09-12", "visitor-address");
    const secondDay = deriveDailyVisitorHash(secret, "2026-09-13", "visitor-address");

    expect(firstDay).toHaveLength(64);
    expect(secondDay).not.toBe(firstDay);
    expect(deriveSessionHash(secret, sessionId)).toBe(deriveSessionHash(secret, sessionId));
  });

  it("normalizes equivalent internal routes before storage", async () => {
    let recordedEvent: AnalyticsEventInput | undefined;
    const store: AnalyticsStore = {
      recordVisit: vi.fn(async () => ({ recorded: true })),
      recordEngagement: vi.fn(async (event) => { recordedEvent = event; }),
      consumeRateLimitSlot: vi.fn(async () => ({ allowed: true, count: 1 })),
      readSummaries: vi.fn(async () => []),
      deleteExpiredData: vi.fn(async () => ({ events: 0, sessions: 0, rateLimits: 0 })),
    };
    const service = new AnalyticsEventService(store, enabledConfig(), {
      now: () => Date.UTC(2026, 8, 12),
      createSessionId: () => sessionId,
    });

    expect(normalizeAnalyticsRoute("/projects//featured/../")).toBe("/projects");
    await service.process({
      event: { name: "resume_view", route: "/resume/" },
      visitorAddress: "visitor-address",
    });
    expect(recordedEvent?.route).toBe("/resume");
    expect(recordedEvent?.visitorHash).not.toContain("visitor-address");
    expect(recordedEvent?.sessionHash).not.toBe(sessionId);
  });
});
