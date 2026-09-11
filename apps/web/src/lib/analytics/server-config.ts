/** Validates private analytics environment variables without exposing them to client code. */
import type { AnalyticsPublicConfig } from "@portfolio-no-jutsu/contracts";

type Environment = Record<string, string | undefined>;

export type AnalyticsServerConfig =
  | { enabled: false }
  | {
      enabled: true;
      databaseUrl: string;
      databaseAuthToken: string;
      adminToken: string;
      hashSecret: string;
      allowedOrigins: string[];
      cronSecret: string;
    };

const REQUIRED_VALUES = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "ANALYTICS_ADMIN_TOKEN",
  "ANALYTICS_HASH_SECRET",
  "ANALYTICS_ALLOWED_ORIGINS",
  "CRON_SECRET",
] as const;

/**
 * Reads and trims every environment variable required by enabled analytics.
 *
 * @param environment - Environment-variable map to inspect.
 * @returns A complete map of required, non-empty environment values.
 * @throws When one or more required variables are absent or empty.
 */
function readRequiredValues(environment: Environment): Record<(typeof REQUIRED_VALUES)[number], string> {
  const missing = REQUIRED_VALUES.filter((name) => !environment[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing analytics server environment variables: ${missing.join(", ")}`);
  }

  return Object.fromEntries(REQUIRED_VALUES.map((name) => [name, environment[name]!.trim()])) as Record<
    (typeof REQUIRED_VALUES)[number],
    string
  >;
}

/**
 * Validates and normalizes the remote Turso database URL.
 *
 * @param value - Candidate Turso URL from the server environment.
 * @returns The normalized `libsql://` or `https://` URL.
 * @throws When the value is not a valid supported URL.
 */
function parseDatabaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("TURSO_DATABASE_URL must be a valid URL");
  }

  if (url.protocol !== "libsql:" && url.protocol !== "https:") {
    throw new Error("TURSO_DATABASE_URL must use libsql:// or https://");
  }

  return url.toString();
}

/**
 * Enforces the minimum length for a private authentication or hashing secret.
 *
 * @param name - Environment-variable name used in validation errors.
 * @param value - Secret value to validate.
 * @returns The original secret when it meets the minimum length.
 * @throws When the secret contains fewer than 32 characters.
 */
function parseSecret(name: string, value: string): string {
  if (value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters`);
  }

  return value;
}

/**
 * Parses a comma-separated list of exact HTTP origins allowed to submit analytics.
 *
 * @param value - Comma-separated origin list from the server environment.
 * @returns Normalized origins with paths, credentials, queries, and fragments removed by validation.
 * @throws When any entry is not an exact HTTP or HTTPS origin.
 */
function parseAllowedOrigins(value: string): string[] {
  const origins = value.split(",").map((origin) => origin.trim());

  return origins.map((origin) => {
    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(`ANALYTICS_ALLOWED_ORIGINS contains an invalid URL: ${origin}`);
    }

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error(`ANALYTICS_ALLOWED_ORIGINS must contain origins only: ${origin}`);
    }

    return url.origin;
  });
}

/**
 * Builds the private analytics configuration for the current public feature setting.
 *
 * @param publicConfig - Validated owner-facing analytics settings.
 * @param environment - Server environment to read; defaults to `process.env`.
 * @returns Disabled configuration without secrets, or a fully validated enabled configuration.
 * @throws When analytics is enabled and a required private value is missing or invalid.
 */
export function loadAnalyticsServerConfig(
  publicConfig: AnalyticsPublicConfig,
  environment: Environment = process.env,
): AnalyticsServerConfig {
  if (!publicConfig.enabled) {
    return { enabled: false };
  }

  const values = readRequiredValues(environment);

  return {
    enabled: true,
    databaseUrl: parseDatabaseUrl(values.TURSO_DATABASE_URL),
    databaseAuthToken: values.TURSO_AUTH_TOKEN,
    adminToken: parseSecret("ANALYTICS_ADMIN_TOKEN", values.ANALYTICS_ADMIN_TOKEN),
    hashSecret: parseSecret("ANALYTICS_HASH_SECRET", values.ANALYTICS_HASH_SECRET),
    allowedOrigins: parseAllowedOrigins(values.ANALYTICS_ALLOWED_ORIGINS),
    cronSecret: parseSecret("CRON_SECRET", values.CRON_SECRET),
  };
}
