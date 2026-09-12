/** Lazily constructs production analytics dependencies without running migrations. */
import { createClient } from "@libsql/client";

import { portfolioConfig } from "@/lib/portfolio-config";

import { AnalyticsEventService, type AnalyticsEventProcessor } from "./event-service";
import { loadAnalyticsServerConfig } from "./server-config";
import type { AnalyticsStore } from "./store";
import { TursoAnalyticsStore } from "./turso-store";

export type AnalyticsEventRuntime =
  | { enabled: false }
  | {
      enabled: true;
      allowedOrigins: string[];
      service: AnalyticsEventProcessor;
    };

let productionStore: AnalyticsStore | undefined;

function getProductionStore(databaseUrl: string, databaseAuthToken: string): AnalyticsStore {
  if (!productionStore) {
    productionStore = new TursoAnalyticsStore(createClient({
      url: databaseUrl,
      authToken: databaseAuthToken,
    }));
  }
  return productionStore;
}

export function getAnalyticsEventRuntime(): AnalyticsEventRuntime {
  const publicConfig = portfolioConfig.analytics;
  const serverConfig = loadAnalyticsServerConfig(publicConfig);

  if (!serverConfig.enabled) return { enabled: false };

  return {
    enabled: true,
    allowedOrigins: serverConfig.allowedOrigins,
    service: new AnalyticsEventService(
      getProductionStore(serverConfig.databaseUrl, serverConfig.databaseAuthToken),
      {
        enabled: true,
        hashSecret: serverConfig.hashSecret,
        sessionTimeoutMinutes: publicConfig.sessionTimeoutMinutes,
        metrics: publicConfig.metrics,
      },
    ),
  };
}
