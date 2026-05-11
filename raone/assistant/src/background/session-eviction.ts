export class StaleSessionEviction {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.evict(), 300_000); // every 5 minutes
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private evict(): void {
    // Placeholder: evict idle in-memory conversation sessions
  }
}
