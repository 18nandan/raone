import * as fs from "fs";
import * as path from "path";
import { addInstance } from "../lockfile/lockfile.js";
import { allocateFreePort, getUsedPorts } from "../ports/allocator.js";

export class HatchCommand {
  async run(args: string[]): Promise<void> {
    const nameIndex = args.indexOf("--name");
    const name = nameIndex >= 0 && args[nameIndex + 1] ? args[nameIndex + 1] : `raone-${Date.now()}`;
    const isRemote = args.includes("--remote");

    if (isRemote) {
      console.log("Remote provisioning not yet implemented");
      process.exit(1);
    }

    const dataDir = path.join(
      process.env.HOME || process.env.USERPROFILE || "~",
      ".local",
      "share",
      "raone",
      "assistants",
      name
    );

    if (fs.existsSync(dataDir)) {
      throw new Error(`Assistant '${name}' already exists at ${dataDir}`);
    }

    fs.mkdirSync(path.join(dataDir, ".vellum", "protected"), { recursive: true });
    fs.mkdirSync(path.join(dataDir, "workspace", "data", "db"), { recursive: true });
    fs.mkdirSync(path.join(dataDir, "workspace", "data", "logs"), { recursive: true });
    fs.mkdirSync(path.join(dataDir, "workspace", "skills"), { recursive: true });

    const usedPorts = getUsedPorts();
    const daemonPort = await allocateFreePort(7821);
    const gatewayPort = await allocateFreePort(7830);

    addInstance({
      assistantId: name,
      runtimeUrl: `http://localhost:${daemonPort}`,
      cloud: "local",
      hatchedAt: new Date().toISOString(),
      resources: {
        instanceDir: dataDir,
        daemonPort,
        gatewayPort,
        qdrantPort: 6333,
        pidFile: path.join(dataDir, ".vellum", "raone.pid"),
      },
    });

    console.log(`Hatched assistant '${name}'`);
    console.log(`  Instance dir: ${dataDir}`);
    console.log(`  Daemon port:  ${daemonPort}`);
    console.log(`  Gateway port: ${gatewayPort}`);
    console.log("Run 'raone wake " + name + "' to start it.");
  }
}
