import * as fs from "fs";
import { getAllInstances, readLockfile } from "../lockfile/lockfile.js";

export class PsCommand {
  async run(_args: string[]): Promise<void> {
    const lockfile = readLockfile();
    const instances = getAllInstances();

    if (instances.length === 0) {
      console.log("No assistants found. Run 'raone hatch' to create one.");
      return;
    }

    for (const inst of instances) {
      const running = fs.existsSync(inst.resources.pidFile);
      const pid = running ? fs.readFileSync(inst.resources.pidFile, "utf-8").trim() : "-";
      const active = inst.assistantId === lockfile.activeAssistant ? " (active)" : "";
      console.log(
        `${inst.assistantId}${active}  ${running ? "RUNNING" : "STOPPED"}  PID: ${pid}  Port: ${inst.resources.daemonPort}`
      );
    }
  }
}
