/** Applies privacy, session, metric, and abuse rules before analytics persistence. */
import { createHmac, randomBytes } from "node:crypto";

import type { AnalyticsEventRequest, AnalyticsMetricToggles } from "@portfolio-no-jutsu/contracts";

import type { AnalyticsStore } from "./store";
import { utcDayFromTimestamp } from "./store";

const DEFAULT_RATE_LIMIT = 60;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export interface AnalyticsEventServiceConfig {
  enabled: boolean;
  hashSecret: string;
  sessionTimeoutMinutes: number;
  metrics: AnalyticsMetricToggles;
  rateLimit?: number;
  rateLimitWindowMs?: number;
}

export interface AnalyticsEventServiceDependencies {
  now?: () => number;
  createSessionId?: () => string;
}

export interface ProcessAnalyticsEventInput {
  event: AnalyticsEventRequest;
  visitorAddress: string;
  sessionId?: string;
}

export type ProcessAnalyticsEventResult =
  | { status: "ignored" }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "accepted"; sessionId: string; sessionMaxAgeSeconds: number };

export interface AnalyticsEventProcessor {
  process(input: ProcessAnalyticsEventInput): Promise<ProcessAnalyticsEventResult>;
}

function keyedHash(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function deriveDailyVisitorHash(secret: string, utcDay: string, visitorAddress: string): string {
  return keyedHash(secret, `visitor\0${utcDay}\0${visitorAddress}`);
}

export function deriveSessionHash(secret: string, sessionId: string): string {
  return keyedHash(secret, `session\0${sessionId}`);
}

function deriveRateLimitHash(secret: string, visitorAddress: string): string {
  return keyedHash(secret, `rate-limit\0${visitorAddress}`);
}

function metricIsEnabled(eventName: AnalyticsEventRequest["name"], metrics: AnalyticsMetricToggles): boolean {
  if (eventName === "visit") return metrics.dailyVisits || metrics.dailyUniqueVisitors;
  if (eventName === "resume_view") return metrics.resumeViews;
  return metrics.resumeDownloads;
}

export function normalizeAnalyticsRoute(route: string): string {
  const normalized = new URL(route, "https://analytics.invalid").pathname.replace(/\/{2,}/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

function validSessionId(sessionId: string | undefined): sessionId is string {
  return Boolean(sessionId && SESSION_TOKEN_PATTERN.test(sessionId));
}

/** Coordinates analytics behavior without depending on HTTP or Turso details. */
export class AnalyticsEventService implements AnalyticsEventProcessor {
  private readonly now: () => number;
  private readonly createSessionId: () => string;

  constructor(
    private readonly store: AnalyticsStore,
    private readonly config: AnalyticsEventServiceConfig,
    dependencies: AnalyticsEventServiceDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.createSessionId = dependencies.createSessionId ?? (() => randomBytes(32).toString("base64url"));
  }

  async process(input: ProcessAnalyticsEventInput): Promise<ProcessAnalyticsEventResult> {
    if (!this.config.enabled || !metricIsEnabled(input.event.name, this.config.metrics)) {
      return { status: "ignored" };
    }

    const now = this.now();
    const utcDay = utcDayFromTimestamp(now);
    const rateLimitWindowMs = this.config.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
    const windowStartedAt = Math.floor(now / rateLimitWindowMs) * rateLimitWindowMs;
    const rateLimit = this.config.rateLimit ?? DEFAULT_RATE_LIMIT;
    const rateLimitResult = await this.store.consumeRateLimitSlot({
      visitorHash: deriveRateLimitHash(this.config.hashSecret, input.visitorAddress),
      windowStartedAt,
      limit: rateLimit,
    });

    if (!rateLimitResult.allowed) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.max(1, Math.ceil((windowStartedAt + rateLimitWindowMs - now) / 1_000)),
      };
    }

    const sessionId = validSessionId(input.sessionId) ? input.sessionId : this.createSessionId();
    const sessionHash = deriveSessionHash(this.config.hashSecret, sessionId);
    const visitorHash = deriveDailyVisitorHash(this.config.hashSecret, utcDay, input.visitorAddress);
    const sessionMaxAgeSeconds = this.config.sessionTimeoutMinutes * 60;
    const occurredAt = now;
    const route = normalizeAnalyticsRoute(input.event.route);

    if (input.event.name === "visit") {
      await this.store.recordVisit(
        { type: "visit", occurredAt, utcDay, route, visitorHash, sessionHash },
        {
          sessionHash,
          lastSeenAt: occurredAt,
          expiresAt: occurredAt + sessionMaxAgeSeconds * 1_000,
        },
      );
    } else {
      await this.store.recordEngagement({
        type: input.event.name,
        occurredAt,
        utcDay,
        route,
        visitorHash,
        sessionHash,
      });
    }

    return { status: "accepted", sessionId, sessionMaxAgeSeconds };
  }
}
