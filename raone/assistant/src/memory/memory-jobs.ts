import { Database } from "bun:sqlite";

interface MemoryJob {
  id: string;
  type: "embed" | "extract" | "cleanup_stale";
  status: "pending" | "running" | "done" | "failed";
  itemId?: string;
  conversationId?: string;
}

export class MemoryJobsWorker {
  private db: Database;
  private running = false;

  constructor(db: Database) {
    this.db = db;
  }

  start(): void {
    this.running = true;
    this.runLoop();
  }

  stop(): void {
    this.running = false;
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      try {
        const jobs = this.db
          .query("SELECT * FROM memory_jobs WHERE status = 'pending' LIMIT 10")
          .all() as MemoryJob[];

        for (const job of jobs) {
          await this.processJob(job);
        }
      } catch (err) {
        console.error("MemoryJobsWorker error:", err);
      }

      await this.sleep(1500);
    }
  }

  private async processJob(job: MemoryJob): Promise<void> {
    this.db.run("UPDATE memory_jobs SET status = 'running', updated_at = ? WHERE id = ?", [
      Date.now(),
      job.id,
    ]);

    try {
      switch (job.type) {
        case "embed":
          await this.embedItem(job.itemId!);
          break;
        case "extract":
          await this.extractMemories(job.conversationId!);
          break;
        case "cleanup_stale":
          await this.cleanupStaleItems();
          break;
      }
      this.db.run("UPDATE memory_jobs SET status = 'done', updated_at = ? WHERE id = ?", [
        Date.now(),
        job.id,
      ]);
    } catch (err) {
      console.error(`Job ${job.id} (${job.type}) failed:`, err);
      this.db.run("UPDATE memory_jobs SET status = 'failed', updated_at = ? WHERE id = ?", [
        Date.now(),
        job.id,
      ]);
    }
  }

  private async embedItem(itemId: string): Promise<void> {
    const item = this.db
      .query("SELECT * FROM memory_items WHERE id = ?")
      .get(itemId) as { id: string; content: string } | undefined;

    if (!item) return;

    // Placeholder: would call embedding API
    const mockEmbedding = new Array(1536).fill(0);
    this.db.run(
      "INSERT INTO memory_embeddings (id, item_id, embedding, model) VALUES (?, ?, ?, ?)",
      [crypto.randomUUID(), itemId, JSON.stringify(mockEmbedding), "text-embedding-3-small"],
    );
  }

  private async extractMemories(conversationId: string): Promise<void> {
    // Placeholder: would call LLM to extract structured memories from conversation
    console.log(`Extracting memories from conversation ${conversationId}`);
  }

  private async cleanupStaleItems(): Promise<void> {
    this.db.run("DELETE FROM memory_items WHERE expires_at IS NOT NULL AND expires_at <= ?", [
      Date.now(),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
