import { setActiveAssistant } from "../lockfile/lockfile.js";

export class UseCommand {
  async run(args: string[]): Promise<void> {
    const name = args[0];
    if (!name) {
      throw new Error("Usage: raone use <name>");
    }
    setActiveAssistant(name);
    console.log(`Active assistant set to '${name}'.`);
  }
}
