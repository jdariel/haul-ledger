/**
 * Database backup module.
 *
 * Runs `pg_dump` against DATABASE_URL, compresses the output with gzip, and:
 *   1. Saves a timestamped .sql.gz file locally (BACKUP_DIR, default: ./backups/)
 *   2. Uploads the file to Replit Object Storage for durable long-term retention
 *
 * Local files are pruned after BACKUP_RETENTION_DAYS (default: 7).
 * Remote files in GCS are kept indefinitely; manage them from the Replit
 * Object Storage pane or via the admin API.
 */

import { spawn } from "child_process";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { createGzip } from "zlib";
import path from "path";
import { config } from "../config";
import { objectStorageClient, signObjectURL } from "./objectStorage";

// ── Local storage config ─────────────────────────────────────────────────────

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(process.cwd(), "backups");

const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 7);

// ── Remote (GCS) storage config ───────────────────────────────────────────────

const GCS_BUCKET = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? null;
const GCS_PREFIX = "backups"; // backups/<filename> inside the bucket

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackupResult {
  filename: string;
  localPath: string;
  sizeBytes: number;
  durationMs: number;
  gcsObjectName: string | null; // null if GCS upload was skipped
}

// ── Core: run a pg_dump backup ────────────────────────────────────────────────

export async function runBackup(): Promise<BackupResult> {
  const startedAt = Date.now();

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Timestamped filename: backup_2026-03-22T02-00-00Z.sql.gz
  const ts = new Date().toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "Z");
  const filename = `backup_${ts}.sql.gz`;
  const localPath = path.join(BACKUP_DIR, filename);

  // ── Step 1: pg_dump → gzip → local file ─────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    const pgDump = spawn("pg_dump", [
      "--dbname", config.databaseUrl,
      "--format", "plain",
      "--no-owner",
      "--no-acl",
      "--quote-all-identifiers",
    ]);

    const gzip = createGzip({ level: 6 });
    const outFile = createWriteStream(localPath);

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

  const { size: sizeBytes } = await fs.stat(localPath);

  // ── Step 2: upload to GCS ────────────────────────────────────────────────
  let gcsObjectName: string | null = null;

  if (GCS_BUCKET) {
    try {
      gcsObjectName = await uploadToGcs(localPath, filename);
    } catch (err) {
      // GCS upload failure is non-fatal — local backup is still intact
      console.error(`[backup] ⚠️  GCS upload failed (local backup preserved): ${err}`);
    }
  }

  return { filename, localPath, sizeBytes, durationMs: Date.now() - startedAt, gcsObjectName };
}

// ── GCS helpers ───────────────────────────────────────────────────────────────

async function uploadToGcs(localFilePath: string, filename: string): Promise<string> {
  const objectName = `${GCS_PREFIX}/${filename}`;
  const bucket = objectStorageClient.bucket(GCS_BUCKET!);
  const gcsFile = bucket.file(objectName);

  await new Promise<void>((resolve, reject) => {
    const readStream = createReadStream(localFilePath);
    const writeStream = gcsFile.createWriteStream({
      resumable: false, // small files — no need for resumable upload
      contentType: "application/gzip",
      metadata: { contentDisposition: `attachment; filename="${filename}"` },
    });

    readStream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    readStream.on("error", reject);
  });

  return objectName;
}

/**
 * Generates a signed GCS download URL for a specific backup file.
 * The URL expires after ttlSec seconds (default: 1 hour).
 */
export async function getBackupDownloadUrl(
  filename: string,
  ttlSec = 3600
): Promise<string> {
  if (!GCS_BUCKET) throw new Error("GCS not configured (DEFAULT_OBJECT_STORAGE_BUCKET_ID not set)");

  const objectName = `${GCS_PREFIX}/${filename}`;

  // Verify the object actually exists before signing
  const [exists] = await objectStorageClient.bucket(GCS_BUCKET).file(objectName).exists();
  if (!exists) throw new Error(`Backup not found in GCS: ${filename}`);

  return signObjectURL({ bucketName: GCS_BUCKET, objectName, method: "GET", ttlSec });
}

// ── Local backup management ───────────────────────────────────────────────────

/**
 * Lists all local backup files, sorted newest-first.
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
 * Deletes local backup files older than RETENTION_DAYS.
 * GCS files are kept indefinitely.
 */
export async function pruneOldBackups(): Promise<string[]> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const all = await listBackups();
  const old = all.filter((b) => b.createdAt.getTime() < cutoff);
  await Promise.all(old.map((b) => fs.unlink(path.join(BACKUP_DIR, b.filename))));
  return old.map((b) => b.filename);
}

export { BACKUP_DIR, RETENTION_DAYS, GCS_BUCKET };
