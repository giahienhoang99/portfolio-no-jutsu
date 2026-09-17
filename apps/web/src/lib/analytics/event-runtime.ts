/** Constructs the event-ingestion view of the shared analytics runtime. */
import { getAnalyticsRuntime } from "./analytics-runtime";
import { AnalyticsEventService, type AnalyticsEventProcessor } from "./event-service";

export type AnalyticsEventRuntime =
  | { enabled: false }
  | {
      enabled: true;
      allowedOrigins: string[];
      service: AnalyticsEventProcessor;
    };

export function getAnalyticsEventRuntime(): AnalyticsEventRuntime {
  const runtime = getAnalyticsRuntime();

  if (!runtime.enabled) return { enabled: false };

  return {
    enabled: true,
    allowedOrigins: runtime.serverConfig.allowedOrigins,
    service: new AnalyticsEventService(
      runtime.store,
      {
        enabled: true,
        hashSecret: runtime.serverConfig.hashSecret,
        sessionTimeoutMinutes: runtime.publicConfig.sessionTimeoutMinutes,
        metrics: runtime.publicConfig.metrics,
      },
    ),
  };
}
