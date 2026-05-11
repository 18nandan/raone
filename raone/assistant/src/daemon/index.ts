#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

import { RuntimeHttpServer } from "./http-server.js";
import { MemoryRetrieval } from "../memory/retrieval.js";
import { MemoryJobsWorker } from "../memory/memory-jobs.js";
import { IdentitySystem } from "../identity/index.js";
import { SkillLoader } from "../skills/loader.js";
import { SkillRunner } from "../skills/runners.js";
import { HeartbeatScheduler } from "../background/heartbeat.js";
import { CronScheduler } from "../background/cron.js";
import { DiskPressureGuard } from "../background/disk-pressure.js";
import { StaleSessionEviction } from "../background/session-eviction.js";
import { UpdateBulletinProcessor } from "../background/update-bulletin.js";

async function runWorkspaceMigrations(workspaceDir: string): Promise<void> {
  const dbDir = path.join(workspaceDir, "data", "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

async function runDbMigrations(db: Database): Promise<void> {
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New conversation',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      metadata TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tool_invocations (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id),
      tool_name TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_segments (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('identity','preference','project','event','contact','fact')),
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER,
      scope TEXT NOT NULL DEFAULT 'user' CHECK(scope IN ('user','channel'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_item_sources (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES memory_items(id),
      segment_id TEXT NOT NULL REFERENCES memory_segments(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_summaries (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      summary TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES memory_items(id),
      embedding TEXT NOT NULL,
      model TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('embed','extract','cleanup_stale')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed')),
      item_id TEXT,
      conversation_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS channel_inbound_events (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      channel_event_id TEXT NOT NULL UNIQUE,
      processed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_keys (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE REFERENCES conversations(id),
      encryption_key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id),
      text TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      routing_intent TEXT,
      routing_hints_json TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      action TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      cron_job_id TEXT NOT NULL REFERENCES cron_jobs(id),
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL CHECK(status IN ('running','done','failed'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS task_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL CHECK(status IN ('running','done','failed')),
      output TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trust_level TEXT NOT NULL DEFAULT 'unknown' CHECK(trust_level IN ('guardian','trusted','unknown')),
      external_ids TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create indexes
  db.run("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_memory_jobs_status ON memory_jobs(status)");
  db.run("CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at)");
}

async function startDaemon(): Promise<void> {
  const workspaceDir = process.env.VEILLUM_WORKSPACE_DIR || "./workspace";
  const instanceDir = process.env.INSTANCE_DIR || ".";
  const port = parseInt(process.env.RUNTIME_HTTP_PORT || "7821", 10);

  const identityDir = path.join(instanceDir, "..");
  const dbPath = path.join(workspaceDir, "data", "db", "assistant.db");

  console.log(`raone daemon starting on port ${port}`);
  console.log(`  Workspace: ${workspaceDir}`);
  console.log(`  Database:  ${dbPath}`);

  // Run migrations
  await runWorkspaceMigrations(workspaceDir);

  // Initialize database
  const db = new Database(dbPath, { create: true });
  await runDbMigrations(db);

  // Initialize subsystems
  const memoryRetrieval = new MemoryRetrieval();
  const identitySystem = new IdentitySystem(identityDir);
  identitySystem.ensureFiles();

  const skillLoader = new SkillLoader(path.join(workspaceDir, "skills"));
  const skillRunner = new SkillRunner();
  const diskPressureGuard = new DiskPressureGuard(workspaceDir);

  // Start background workers
  const memoryJobsWorker = new MemoryJobsWorker(db);
  memoryJobsWorker.start();

  const heartbeatScheduler = new HeartbeatScheduler(db);
  heartbeatScheduler.start();

  const cronScheduler = new CronScheduler(db);
  cronScheduler.start();

  diskPressureGuard.start();

  const sessionEviction = new StaleSessionEviction();
  sessionEviction.start();

  const updateBulletinProcessor = new UpdateBulletinProcessor();
  updateBulletinProcessor.start();

  // Start HTTP server
  const server = new RuntimeHttpServer(
    port,
    db,
    memoryRetrieval,
    identitySystem,
    skillLoader,
    skillRunner,
    diskPressureGuard,
  );
  await server.listen();

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    memoryJobsWorker.stop();
    heartbeatScheduler.stop();
    cronScheduler.stop();
    diskPressureGuard.stop();
    sessionEviction.stop();
    updateBulletinProcessor.stop();
    db.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startDaemon().catch((err) => {
  console.error("Fatal error starting daemon:", err);
  process.exit(1);
});
