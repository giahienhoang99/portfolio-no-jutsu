import type { Client } from "@libsql/client";

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

function changedRows(rowsAffected: number): number {
  return Number(rowsAffected);
}

/** Production AnalyticsStore implementation backed by Turso/libSQL. */
export class TursoAnalyticsStore implements AnalyticsStore {
  constructor(private readonly client: Client) {}

  async recordVisit(event: AnalyticsEventInput, session: AnalyticsSession): Promise<{ recorded: boolean }> {
    const transaction = await this.client.transaction("write");

    try {
      const existing = await transaction.execute({
        sql: "SELECT expires_at FROM analytics_sessions WHERE session_hash = ?",
        args: [session.sessionHash],
      });
      const expiresAt = existing.rows[0]?.expires_at;
      const active = typeof expiresAt === "number" && expiresAt > event.occurredAt;

      await transaction.execute({
        sql: `INSERT INTO analytics_sessions (session_hash, last_seen_at, expires_at)
              VALUES (?, ?, ?)
              ON CONFLICT(session_hash) DO UPDATE SET
                last_seen_at = excluded.last_seen_at,
                expires_at = excluded.expires_at`,
        args: [session.sessionHash, session.lastSeenAt, session.expiresAt],
      });

      if (!active) {
        await transaction.execute({
          sql: `INSERT INTO analytics_events
                (occurred_at, utc_day, type, route, visitor_hash, session_hash)
                VALUES (?, ?, 'visit', ?, ?, ?)`,
          args: [event.occurredAt, event.utcDay, event.route, event.visitorHash, event.sessionHash ?? null],
        });
      }

      await transaction.commit();
      return { recorded: !active };
    } catch (error) {
      if (!transaction.closed) await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }

  async recordEngagement(event: AnalyticsEventInput): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO analytics_events
            (occurred_at, utc_day, type, route, visitor_hash, session_hash)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [event.occurredAt, event.utcDay, event.type, event.route, event.visitorHash, event.sessionHash ?? null],
    });
  }

  async consumeRateLimitSlot(input: RateLimitInput): Promise<RateLimitResult> {
    const result = await this.client.execute({
      sql: `INSERT INTO analytics_rate_limits (visitor_hash, window_started_at, request_count)
            VALUES (?, ?, 1)
            ON CONFLICT(visitor_hash, window_started_at) DO UPDATE SET
              request_count = request_count + 1
            RETURNING request_count`,
      args: [input.visitorHash, input.windowStartedAt],
    });
    const count = Number(result.rows[0]?.request_count ?? 0);
    return { allowed: count <= input.limit, count };
  }

  async readSummaries(fromDay: string, toDay: string): Promise<DailyAnalyticsSummary[]> {
    const result = await this.client.execute({
      sql: `SELECT utc_day AS day,
                    SUM(CASE WHEN type = 'visit' THEN 1 ELSE 0 END) AS visits,
                    COUNT(DISTINCT visitor_hash) AS estimated_unique_visitors,
                    SUM(CASE WHEN type = 'resume_view' THEN 1 ELSE 0 END) AS resume_views,
                    SUM(CASE WHEN type = 'resume_download' THEN 1 ELSE 0 END) AS resume_downloads
             FROM analytics_events
             WHERE utc_day >= ? AND utc_day <= ?
             GROUP BY utc_day
             ORDER BY utc_day ASC`,
      args: [fromDay, toDay],
    });

    return result.rows.map((row) => ({
      day: String(row.day),
      visits: Number(row.visits),
      estimatedUniqueVisitors: Number(row.estimated_unique_visitors),
      resumeViews: Number(row.resume_views),
      resumeDownloads: Number(row.resume_downloads),
    }));
  }

  async deleteExpiredData(input: DeleteExpiredDataInput): Promise<DeleteExpiredDataResult> {
    const [events, sessions, rateLimits] = await this.client.batch(
      [
        { sql: "DELETE FROM analytics_events WHERE id IN (SELECT id FROM analytics_events WHERE occurred_at < ? ORDER BY id LIMIT ?)", args: [input.eventsBefore, input.limit] },
        { sql: "DELETE FROM analytics_sessions WHERE session_hash IN (SELECT session_hash FROM analytics_sessions WHERE expires_at < ? ORDER BY expires_at LIMIT ?)", args: [input.sessionsBefore, input.limit] },
        { sql: "DELETE FROM analytics_rate_limits WHERE rowid IN (SELECT rowid FROM analytics_rate_limits WHERE window_started_at < ? ORDER BY window_started_at LIMIT ?)", args: [input.rateLimitsBefore, input.limit] },
      ],
      "write",
    );
    return { events: changedRows(events.rowsAffected), sessions: changedRows(sessions.rowsAffected), rateLimits: changedRows(rateLimits.rowsAffected) };
  }
}
