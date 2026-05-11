import { Database } from "bun:sqlite";

export class HeartbeatScheduler {
  private db: Database;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(db: Database) {
    this.db = db;
  }

  start(): void {
    this.intervalId = setInterval(() => this.tick(), 60 * 60 * 1000); // every hour
    // Also run once after startup
    setTimeout(() => this.tick(), 5000);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick(): Promise<void> {
    try {
      const pendingReminders = this.db
        .query("SELECT * FROM reminders WHERE due_at <= ? AND completed = 0")
        .all(Date.now()) as Array<{ id: string; text: string }>;

      if (pendingReminders.length > 0) {
        console.log(
          `Heartbeat: ${pendingReminders.length} pending reminder(s)`,
        );
      }
    } catch (err) {
      console.error("Heartbeat error:", err);
    }
  }
}
