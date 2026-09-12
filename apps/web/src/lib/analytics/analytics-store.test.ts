import { createClient, type Client } from "@libsql/client";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { InMemoryAnalyticsStore } from "./in-memory-store";
import { pendingMigrations, runMigrations } from "./migrations";
import type { AnalyticsEventInput, AnalyticsStore } from "./store";
import { TursoAnalyticsStore } from "./turso-store";

const dayOne = Date.UTC(2026, 8, 10, 23, 59, 59);
const dayTwo = Date.UTC(2026, 8, 11, 0, 0, 0);

function event(overrides: Partial<AnalyticsEventInput> = {}): AnalyticsEventInput {
  return {
    type: "visit",
    occurredAt: dayOne,
    utcDay: "2026-09-10",
    route: "/",
    visitorHash: "visitor-one",
    sessionHash: "session-one",
    ...overrides,
  };
}

function session(overrides = {}) {
  return { sessionHash: "session-one", lastSeenAt: dayOne, expiresAt: dayOne + 30 * 60_000, ...overrides };
}

async function assertStoreContract(store: AnalyticsStore): Promise<void> {
  expect(await store.recordVisit(event(), session())).toEqual({ recorded: true });
  expect(await store.recordVisit(event({ occurredAt: dayOne + 1 }), session({ lastSeenAt: dayOne + 1 }))).toEqual({ recorded: false });
  expect(await store.recordVisit(event({ occurredAt: dayOne + 30 * 60_000 }), session({ lastSeenAt: dayOne + 30 * 60_000, expiresAt: dayOne + 60 * 60_000 }))).toEqual({ recorded: true });

  await store.recordEngagement(event({ type: "resume_view", occurredAt: dayTwo, utcDay: "2026-09-11", visitorHash: "visitor-two" }));
  await store.recordEngagement(event({ type: "resume_download", occurredAt: dayTwo + 1, utcDay: "2026-09-11", visitorHash: "visitor-two" }));
  expect(await store.readSummaries("2026-09-10", "2026-09-11")).toEqual([
    { day: "2026-09-10", visits: 2, estimatedUniqueVisitors: 1, resumeViews: 0, resumeDownloads: 0 },
    { day: "2026-09-11", visits: 0, estimatedUniqueVisitors: 1, resumeViews: 1, resumeDownloads: 1 },
  ]);

  expect(await store.consumeRateLimitSlot({ visitorHash: "rate-visitor", windowStartedAt: dayOne, limit: 2 })).toEqual({ allowed: true, count: 1 });
  expect(await store.consumeRateLimitSlot({ visitorHash: "rate-visitor", windowStartedAt: dayOne, limit: 2 })).toEqual({ allowed: true, count: 2 });
  expect(await store.consumeRateLimitSlot({ visitorHash: "rate-visitor", windowStartedAt: dayOne, limit: 2 })).toEqual({ allowed: false, count: 3 });
}

describe("analytics migrations", () => {
  let client: Client | undefined;
  let directory: string | undefined;

  afterEach(async () => {
    client?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
    client = undefined;
    directory = undefined;
  });

  async function localClient(): Promise<Client> {
    directory = await mkdtemp(join(tmpdir(), "portfolio-analytics-"));
    client = createClient({ url: `file:${join(directory, "analytics.db")}` });
    return client;
  }

  it("applies a clean schema once and reports no changes on a second run", async () => {
    const database = await localClient();
    expect(await pendingMigrations(database)).toHaveLength(1);
    expect(await runMigrations(database, dayOne)).toEqual(["001_initial"]);
    expect(await pendingMigrations(database)).toEqual([]);
    expect(await runMigrations(database, dayTwo)).toEqual([]);

    const tables = await database.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.rows.map((row) => row.name)).toEqual([
      "analytics_events",
      "analytics_rate_limits",
      "analytics_sessions",
      "schema_migrations",
      "sqlite_sequence",
    ]);
  });

  it("gives the Turso adapter the same contract as the in-memory adapter", async () => {
    const database = await localClient();
    await runMigrations(database);
    await assertStoreContract(new TursoAnalyticsStore(database));
    await assertStoreContract(new InMemoryAnalyticsStore());
  });

  it("deletes only expired rows, respecting the requested batch size", async () => {
    const database = await localClient();
    await runMigrations(database);
    const store = new TursoAnalyticsStore(database);
    await store.recordEngagement(event({ type: "resume_view", occurredAt: 100, utcDay: "1970-01-01", visitorHash: "old-one" }));
    await store.recordEngagement(event({ type: "resume_view", occurredAt: 200, utcDay: "1970-01-01", visitorHash: "old-two" }));
    await store.recordEngagement(event({ type: "resume_view", occurredAt: 300, utcDay: "1970-01-01", visitorHash: "new" }));
    await store.recordVisit(event({ occurredAt: 100, utcDay: "1970-01-01", visitorHash: "old-session", sessionHash: "old-session" }), { sessionHash: "old-session", lastSeenAt: 100, expiresAt: 100 });
    await store.consumeRateLimitSlot({ visitorHash: "old-rate", windowStartedAt: 100, limit: 10 });

    expect(await store.deleteExpiredData({ eventsBefore: 300, sessionsBefore: 200, rateLimitsBefore: 200, limit: 1 })).toEqual({ events: 1, sessions: 1, rateLimits: 1 });
    expect((await store.readSummaries("1970-01-01", "1970-01-01"))[0]?.resumeViews).toBe(2);
  });
});
