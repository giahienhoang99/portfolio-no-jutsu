import type {
  AnalyticsEventInput,
  AnalyticsSession,
  AnalyticsStore,
  DailyAnalyticsSummary,
  DeleteExpiredDataInput,
  DeleteExpiredDataResult,
  RateLimitInput,
  RateLimitResult,
} from "./store";

/** Test adapter with the same observable behavior as TursoAnalyticsStore. */
export class InMemoryAnalyticsStore implements AnalyticsStore {
  private readonly events: AnalyticsEventInput[] = [];
  private readonly sessions = new Map<string, AnalyticsSession>();
  private readonly rateLimits = new Map<string, number>();

  async recordVisit(event: AnalyticsEventInput, session: AnalyticsSession): Promise<{ recorded: boolean }> {
    const current = this.sessions.get(session.sessionHash);
    const recorded = !current || current.expiresAt <= event.occurredAt;
    this.sessions.set(session.sessionHash, { ...session });
    if (recorded) this.events.push({ ...event, type: "visit" });
    return { recorded };
  }

  async recordEngagement(event: AnalyticsEventInput): Promise<void> {
    this.events.push({ ...event });
  }

  async consumeRateLimitSlot(input: RateLimitInput): Promise<RateLimitResult> {
    const key = `${input.visitorHash}:${input.windowStartedAt}`;
    const count = (this.rateLimits.get(key) ?? 0) + 1;
    this.rateLimits.set(key, count);
    return { allowed: count <= input.limit, count };
  }

  async readSummaries(fromDay: string, toDay: string): Promise<DailyAnalyticsSummary[]> {
    const days = new Map<string, { visits: number; visitors: Set<string>; resumeViews: number; resumeDownloads: number }>();
    for (const event of this.events) {
      if (event.utcDay < fromDay || event.utcDay > toDay) continue;
      const summary = days.get(event.utcDay) ?? { visits: 0, visitors: new Set<string>(), resumeViews: 0, resumeDownloads: 0 };
      summary.visitors.add(event.visitorHash);
      if (event.type === "visit") summary.visits += 1;
      if (event.type === "resume_view") summary.resumeViews += 1;
      if (event.type === "resume_download") summary.resumeDownloads += 1;
      days.set(event.utcDay, summary);
    }
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, summary]) => ({
      day, visits: summary.visits, estimatedUniqueVisitors: summary.visitors.size,
      resumeViews: summary.resumeViews, resumeDownloads: summary.resumeDownloads,
    }));
  }

  async deleteExpiredData(input: DeleteExpiredDataInput): Promise<DeleteExpiredDataResult> {
    let events = 0;
    for (let index = 0; index < this.events.length && events < input.limit;) {
      if (this.events[index].occurredAt < input.eventsBefore) {
        this.events.splice(index, 1);
        events += 1;
      } else {
        index += 1;
      }
    }
    let sessions = 0;
    for (const [hash, session] of this.sessions) {
      if (sessions >= input.limit) break;
      if (session.expiresAt < input.sessionsBefore) { this.sessions.delete(hash); sessions += 1; }
    }
    let rateLimits = 0;
    for (const key of this.rateLimits.keys()) {
      if (rateLimits >= input.limit) break;
      const windowStartedAt = Number(key.slice(key.lastIndexOf(":" ) + 1));
      if (windowStartedAt < input.rateLimitsBefore) { this.rateLimits.delete(key); rateLimits += 1; }
    }
    return { events, sessions, rateLimits };
  }
}
