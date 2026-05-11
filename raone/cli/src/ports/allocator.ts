import * as net from "net";
import { readLockfile } from "../lockfile/lockfile.js";

const BASE_PORTS = {
  daemon: 7821,
  gateway: 7830,
  qdrant: 6333,
};

export function allocatePort(basePort: number, usedPorts: number[]): number {
  let port = basePort;
  while (usedPorts.includes(port)) {
    port++;
  }
  return port;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function allocateFreePort(basePort: number): Promise<number> {
  let port = basePort;
  while (!(await isPortFree(port))) {
    port++;
  }
  return port;
}

export function getUsedPorts(excludeId?: string): number[] {
  const lockfile = readLockfile();
  return lockfile.assistants
    .filter((a) => a.assistantId !== excludeId)
    .flatMap((a) => [a.resources.daemonPort, a.resources.gatewayPort]);
}
