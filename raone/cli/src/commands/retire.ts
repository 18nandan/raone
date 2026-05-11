import * as fs from "fs";
import { getInstance, removeInstance } from "../lockfile/lockfile.js";

export class RetireCommand {
  async run(args: string[]): Promise<void> {
    const assistantId = args[0];
    if (!assistantId) {
      throw new Error("Usage: raone retire <assistantId>");
    }

    const instance = getInstance(assistantId);
    if (!instance) {
      throw new Error(`Assistant '${assistantId}' not found.`);
    }

    if (fs.existsSync(instance.resources.pidFile)) {
      console.log(`Assistant '${assistantId}' is running. Please 'raone sleep ${assistantId}' first.`);
      return;
    }

    fs.rmSync(instance.resources.instanceDir, { recursive: true, force: true });
    removeInstance(assistantId);
    console.log(`Retired assistant '${assistantId}'.`);
  }
}
