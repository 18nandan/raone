import { Database } from "bun:sqlite";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  action: string;
  enabled: boolean;
}

export class CronScheduler {
  private db: Database;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(db: Database) {
    this.db = db;
  }

  start(): void {
    this.intervalId = setInterval(() => this.tick(), 60_000); // every minute
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private tick(): void {
    try {
      const jobs = this.db
        .query("SELECT * FROM cron_jobs WHERE enabled = 1")
        .all() as CronJob[];

      for (const job of jobs) {
        if (this.shouldRun(job.schedule)) {
          this.executeJob(job);
        }
      }
    } catch (err) {
      console.error("Cron scheduler error:", err);
    }
  }

  private shouldRun(schedule: string): boolean {
    // Simple cron parser for "every N minutes" or hourly
    if (schedule === "hourly") return new Date().getMinutes() === 0;
    if (schedule.startsWith("every ")) {
      const minutes = parseInt(schedule.slice(6), 10);
      if (!isNaN(minutes) && minutes > 0) {
        return new Date().getMinutes() % minutes === 0;
      }
    }
    return false;
  }

  private executeJob(job: CronJob): void {
    const runId = crypto.randomUUID();
    this.db.run(
      "INSERT INTO cron_runs (id, cron_job_id, started_at, status) VALUES (?, ?, ?, ?)",
      [runId, job.id, Date.now(), "running"],
    );

    try {
      // Execute the action (placeholder)
      console.log(`Cron: executing job '${job.name}' (action: ${job.action})`);
      this.db.run(
        "UPDATE cron_runs SET completed_at = ?, status = ? WHERE id = ?",
        [Date.now(), "done", runId],
      );
    } catch (err) {
      console.error(`Cron job '${job.name}' failed:`, err);
      this.db.run(
        "UPDATE cron_runs SET completed_at = ?, status = ? WHERE id = ?",
        [Date.now(), "failed", runId],
      );
    }
  }
}
