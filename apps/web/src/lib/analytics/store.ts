/**
 * Server-side persistence boundary for analytics. All timestamps are Unix
 * milliseconds and all day values are UTC ISO dates (YYYY-MM-DD).
 */
export type AnalyticsEventType = "visit" | "resume_view" | "resume_download";

export interface AnalyticsEventInput {
  type: AnalyticsEventType;
  occurredAt: number;
  utcDay: string;
  route: string;
  visitorHash: string;
  sessionHash?: string;
}

export interface AnalyticsSession {
  sessionHash: string;
  lastSeenAt: number;
  expiresAt: number;
}

export interface RateLimitInput {
  visitorHash: string;
  windowStartedAt: number;
  limit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

export interface DailyAnalyticsSummary {
  day: string;
  visits: number;
  estimatedUniqueVisitors: number;
  resumeViews: number;
  resumeDownloads: number;
}

export interface DeleteExpiredDataInput {
  eventsBefore: number;
  sessionsBefore: number;
  rateLimitsBefore: number;
  limit: number;
}

export interface DeleteExpiredDataResult {
  events: number;
  sessions: number;
  rateLimits: number;
}

export interface AnalyticsStore {
  /**
   * Records a visit only when the supplied session does not exist or has
   * expired. The session is always refreshed with the supplied timestamps.
   */
  recordVisit(event: AnalyticsEventInput, session: AnalyticsSession): Promise<{ recorded: boolean }>;
  recordEngagement(event: AnalyticsEventInput): Promise<void>;
  consumeRateLimitSlot(input: RateLimitInput): Promise<RateLimitResult>;
  readSummaries(fromDay: string, toDay: string): Promise<DailyAnalyticsSummary[]>;
  deleteExpiredData(input: DeleteExpiredDataInput): Promise<DeleteExpiredDataResult>;
}

export function utcDayFromTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}
