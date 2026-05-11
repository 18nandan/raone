import * as fs from "fs";

export class DiskPressureGuard {
  private workspaceDir: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private acknowledged = false;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  start(): void {
    this.intervalId = setInterval(() => this.check(), 60_000);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  acknowledge(): void {
    this.acknowledged = true;
  }

  override(): void {
    this.acknowledged = false;
  }

  getStatus(): { status: "ok" | "warning" | "critical"; acknowledged: boolean } {
    // Check available disk space
    try {
      const stats = fs.statfsSync(this.workspaceDir);
      const freeBytes = stats.bfree * stats.bsize;
      const totalBytes = stats.blocks * stats.bsize;
      const freePercent = (freeBytes / totalBytes) * 100;

      if (freePercent < 5) {
        return { status: "critical", acknowledged: this.acknowledged };
      }
      if (freePercent < 15) {
        return { status: "warning", acknowledged: this.acknowledged };
      }
      return { status: "ok", acknowledged: false };
    } catch {
      return { status: "ok", acknowledged: false };
    }
  }

  private check(): void {
    const { status } = this.getStatus();
    if (status === "critical" && !this.acknowledged) {
      console.warn("Disk pressure critical — no space remaining!");
    }
  }
}
