import { createClient } from "@libsql/client";

import { pendingMigrations, runMigrations } from "./migrations";

function databaseClientFromEnvironment() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is required to run analytics migrations.");
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

async function main(): Promise<void> {
  const client = databaseClientFromEnvironment();
  try {
    const pending = await pendingMigrations(client);
    if (process.argv.includes("--check")) {
      if (pending.length > 0) {
        console.error(`Pending analytics migrations: ${pending.map((migration) => migration.version).join(", ")}`);
        process.exitCode = 1;
      } else console.log("Analytics migrations are current.");
      return;
    }
    const applied = await runMigrations(client);
    console.log(applied.length === 0 ? "Analytics migrations are current." : `Applied analytics migrations: ${applied.join(", ")}`);
  } finally { client.close(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Analytics migration failed.");
  process.exitCode = 1;
});
