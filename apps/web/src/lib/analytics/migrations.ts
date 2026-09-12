import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Client } from "@libsql/client";

export interface SqlMigration { version: string; sql: string; }

const defaultMigrationsDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

export async function loadMigrations(directory = defaultMigrationsDirectory): Promise<SqlMigration[]> {
  const fileNames = (await readdir(directory)).filter((name) => /^\d+_[\w-]+\.sql$/.test(name)).sort();
  return Promise.all(fileNames.map(async (fileName) => ({ version: fileName.slice(0, -4), sql: await readFile(`${directory}/${fileName}`, "utf8") })));
}

async function appliedVersions(client: Client): Promise<Set<string>> {
  await client.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)");
  const result = await client.execute("SELECT version FROM schema_migrations");
  return new Set(result.rows.map((row) => String(row.version)));
}

export async function pendingMigrations(client: Client, migrations?: SqlMigration[]): Promise<SqlMigration[]> {
  const applied = await appliedVersions(client);
  return (migrations ?? await loadMigrations()).filter((migration) => !applied.has(migration.version));
}

export async function runMigrations(client: Client, now = Date.now(), migrations?: SqlMigration[]): Promise<string[]> {
  const pending = await pendingMigrations(client, migrations);
  for (const migration of pending) {
    const transaction = await client.transaction("write");
    try {
      await transaction.executeMultiple(migration.sql);
      await transaction.execute({ sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", args: [migration.version, now] });
      await transaction.commit();
    } catch (error) {
      if (!transaction.closed) await transaction.rollback();
      throw error;
    } finally { transaction.close(); }
  }
  return pending.map((migration) => migration.version);
}
