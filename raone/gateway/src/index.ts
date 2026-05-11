#!/usr/bin/env bun
import { GatewayHttpServer } from "./routes/server.js";
import { IpcManager } from "./ipc/manager.js";
import { SecurityResolver } from "./security/resolver.js";

const port = parseInt(process.env.GATEWAY_PORT || "7830", 10);
const daemonUrl = process.env.DAEMON_URL || `http://localhost:${parseInt(process.env.RUNTIME_HTTP_PORT || "7821", 10)}`;
const ipcSocketDir = process.env.GATEWAY_IPC_SOCKET_DIR || "/tmp/gateway-ipc";
const assistantIpcSocketDir = process.env.ASSISTANT_IPC_SOCKET_DIR || "/tmp/assistant-ipc";

const securityResolver = new SecurityResolver();
const ipcManager = new IpcManager(ipcSocketDir, assistantIpcSocketDir);
const server = new GatewayHttpServer(port, daemonUrl, securityResolver, ipcManager);

console.log(`Gateway starting on port ${port}`);
console.log(`  Daemon URL: ${daemonUrl}`);
console.log(`  IPC dir:    ${ipcSocketDir}`);

await ipcManager.start();
await server.listen();

const shutdown = () => {
  console.log("\nGateway shutting down...");
  ipcManager.stop();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
