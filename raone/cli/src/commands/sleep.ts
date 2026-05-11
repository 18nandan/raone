import * as fs from "fs";
import { getInstance, readLockfile } from "../lockfile/lockfile.js";

export class SleepCommand {
  async run(args: string[]): Promise<void> {
    const lockfile = readLockfile();
    const assistantId = args[0] || lockfile.activeAssistant;

    if (!assistantId) {
      throw new Error("No assistant specified and no active assistant set.");
    }

    const instance = getInstance(assistantId);
    if (!instance) {
      throw new Error(`Assistant '${assistantId}' not found.`);
    }

    if (!fs.existsSync(instance.resources.pidFile)) {
      console.log(`Assistant '${assistantId}' is not running.`);
      return;
    }

    const pid = parseInt(fs.readFileSync(instance.resources.pidFile, "utf-8").trim(), 10);

    try {
      process.kill(pid, "SIGTERM");
      console.log(`Sent SIGTERM to assistant '${assistantId}' (PID: ${pid})`);
    } catch (err) {
      console.log(`Could not signal PID ${pid}, removing stale PID file.`);
    }

    try { fs.unlinkSync(instance.resources.pidFile); } catch {}
    console.log(`Assistant '${assistantId}' is now sleeping.`);
  }
}
