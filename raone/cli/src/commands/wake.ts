import * as fs from "fs";
import * as path from "path";
import { getInstance, readLockfile } from "../lockfile/lockfile.js";

export class WakeCommand {
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

    if (fs.existsSync(instance.resources.pidFile)) {
      const pid = fs.readFileSync(instance.resources.pidFile, "utf-8").trim();
      console.log(`Assistant '${assistantId}' is already running (PID: ${pid})`);
      return;
    }

    const daemonPath = path.join(process.cwd(), "..", "assistant", "dist", "daemon", "index.js");
    const env = {
      RUNTIME_HTTP_PORT: String(instance.resources.daemonPort),
      GATEWAY_PORT: String(instance.resources.gatewayPort),
      VEILLUM_WORKSPACE_DIR: path.join(instance.resources.instanceDir, "workspace"),
      INSTANCE_DIR: instance.resources.instanceDir,
      NODE_ENV: "production",
    };

    const child = Bun.spawn(["bun", daemonPath], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    fs.writeFileSync(instance.resources.pidFile, String(child.pid), "utf-8");

    console.log(`Woke assistant '${assistantId}' (PID: ${child.pid})`);
    console.log(`  Runtime URL: ${instance.runtimeUrl}`);

    child.exited.then((code) => {
      try { fs.unlinkSync(instance.resources.pidFile); } catch {}
      console.log(`Assistant '${assistantId}' exited with code ${code}`);
    });
  }
}
