/** Lazily constructs shared production analytics dependencies without running migrations. */
import { createClient } from "@libsql/client";
import type { AnalyticsPublicConfig } from "@portfolio-no-jutsu/contracts";

import { portfolioConfig } from "@/lib/portfolio-config";

import { loadAnalyticsServerConfig, type AnalyticsServerConfig } from "./server-config";
import type { AnalyticsStore } from "./store";
import { TursoAnalyticsStore } from "./turso-store";

type EnabledServerConfig = Extract<AnalyticsServerConfig, { enabled: true }>;

export type AnalyticsRuntime =
  | { enabled: false }
  | {
      enabled: true;
      publicConfig: AnalyticsPublicConfig;
      serverConfig: EnabledServerConfig;
      store: AnalyticsStore;
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

/** Resolves validated public settings, private settings, and the shared Turso adapter. */
export function getAnalyticsRuntime(): AnalyticsRuntime {
  const publicConfig = portfolioConfig.analytics;
  const serverConfig = loadAnalyticsServerConfig(publicConfig);

  if (!serverConfig.enabled) return { enabled: false };

  return {
    enabled: true,
    publicConfig,
    serverConfig,
    store: getProductionStore(serverConfig.databaseUrl, serverConfig.databaseAuthToken),
  };
}
