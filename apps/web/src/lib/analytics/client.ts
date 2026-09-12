/** Sends best-effort, allowlisted analytics events from browser code. */
import {
  analyticsEventRequestSchema,
  type AnalyticsEventRequest,
} from "@portfolio-no-jutsu/contracts";

export type AnalyticsTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<unknown>;

export interface AnalyticsClient {
  report(event: AnalyticsEventRequest): Promise<void>;
}

export interface AnalyticsClientOptions {
  enabled: boolean;
  transport?: AnalyticsTransport;
}

/**
 * Creates a browser analytics client that never lets telemetry failures escape.
 *
 * @param options - Public enablement and an optional transport for tests.
 * @returns A client whose report method safely sends validated events.
 */
export function createAnalyticsClient(options: AnalyticsClientOptions): AnalyticsClient {
  return {
    async report(event) {
      if (!options.enabled) return;

      const parsedEvent = analyticsEventRequestSchema.safeParse(event);
      if (!parsedEvent.success) return;

      try {
        const transport = options.transport ?? globalThis.fetch;
        await transport("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedEvent.data),
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // Analytics is best effort and must never affect the visitor experience.
      }
    },
  };
}
