import { HatchCommand } from "./hatch.js";
import { WakeCommand } from "./wake.js";
import { SleepCommand } from "./sleep.js";
import { PsCommand } from "./ps.js";
import { RetireCommand } from "./retire.js";
import { UseCommand } from "./use.js";
import { ClientCommand } from "./client.js";

export class CommandRouter {
  private commands: Map<string, { run: (args: string[]) => Promise<void> }> = new Map();

  constructor() {
    this.commands.set("hatch", new HatchCommand());
    this.commands.set("wake", new WakeCommand());
    this.commands.set("sleep", new SleepCommand());
    this.commands.set("ps", new PsCommand());
    this.commands.set("retire", new RetireCommand());
    this.commands.set("use", new UseCommand());
    this.commands.set("client", new ClientCommand());
  }

  async dispatch(command: string, args: string[]): Promise<void> {
    const handler = this.commands.get(command);
    if (!handler) {
      throw new Error(`Unknown command: ${command}. Run 'raone --help' for usage.`);
    }
    await handler.run(args);
  }
}
