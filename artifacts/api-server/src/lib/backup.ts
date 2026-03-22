/**
 * Database backup module.
 *
 * Runs `pg_dump` against DATABASE_URL, compresses the output with gzip,
 * saves timestamped .sql.gz files to BACKUP_DIR, and prunes files older
 * than BACKUP_RETENTION_DAYS.
 */

import { spawn } from "child_process";
import { createWriteStream, promises as fs } from "fs";
import { createGzip } from "zlib";
import path from "path";
import { config } from "../config";

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(process.cwd(), "backups");

const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 7);

export interface BackupResult {
  filename: string;
  path: string;
  sizeBytes: number;
  durationMs: number;
}

/**
 * Runs a full `pg_dump` and saves it as a gzip-compressed SQL file.
 * Returns metadata about the created backup file.
 */
export async function runBackup(): Promise<BackupResult> {
  const startedAt = Date.now();

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Timestamped filename: backup_2026-03-22T02-00-00Z.sql.gz
  const ts = new Date().toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "Z");
  const filename = `backup_${ts}.sql.gz`;
  const outPath = path.join(BACKUP_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const pgDump = spawn("pg_dump", [
      "--dbname", config.databaseUrl,
      "--format", "plain",
      "--no-owner",
      "--no-acl",
      "--quote-all-identifiers",
    ]);

    const gzip = createGzip({ level: 6 });
    const outFile = createWriteStream(outPath);

    // pg_dump stdout → gzip → file
    pgDump.stdout.pipe(gzip).pipe(outFile);

    let stderrOutput = "";
    pgDump.stderr.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });

    pgDump.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited with code ${code}: ${stderrOutput.trim()}`));
      }
    });

    outFile.on("finish", resolve);
    outFile.on("error", reject);
    gzip.on("error", reject);
    pgDump.on("error", reject);
  });

  const { size: sizeBytes } = await fs.stat(outPath);
  const durationMs = Date.now() - startedAt;

  return { filename, path: outPath, sizeBytes, durationMs };
}

/**
 * Lists all backup files in BACKUP_DIR, sorted newest-first.
 */
export async function listBackups(): Promise<
  { filename: string; sizeBytes: number; createdAt: Date }[]
> {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const entries = await fs.readdir(BACKUP_DIR);
  const backups = await Promise.all(
    entries
      .filter((f) => f.startsWith("backup_") && f.endsWith(".sql.gz"))
      .map(async (f) => {
        const stat = await fs.stat(path.join(BACKUP_DIR, f));
        return { filename: f, sizeBytes: stat.size, createdAt: stat.mtime };
      })
  );
  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Deletes backup files older than RETENTION_DAYS.
 * Returns the list of deleted filenames.
 */
export async function pruneOldBackups(): Promise<string[]> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const all = await listBackups();
  const old = all.filter((b) => b.createdAt.getTime() < cutoff);
  await Promise.all(
    old.map((b) => fs.unlink(path.join(BACKUP_DIR, b.filename)))
  );
  return old.map((b) => b.filename);
}

export { BACKUP_DIR, RETENTION_DAYS };
