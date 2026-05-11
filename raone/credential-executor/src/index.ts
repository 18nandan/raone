#!/usr/bin/env bun
import { CesRpcServer } from "./rpc/server.js";
import { CredentialVault } from "./security/vault.js";
import { GrantManager } from "./grants/manager.js";

const securityDir = process.env.CREDENTIAL_SECURITY_DIR || "./ces-security";
const socketPath = process.env.CES_SOCKET_PATH || "/tmp/ces.sock";
const httpPort = parseInt(process.env.CES_CREDENTIAL_PORT || "3000", 10);

const vault = new CredentialVault(securityDir);
const grantManager = new GrantManager(vault);
const rpcServer = new CesRpcServer(socketPath, vault, grantManager);

console.log(`CES starting`);
console.log(`  Security dir: ${securityDir}`);
console.log(`  Socket:       ${socketPath}`);
console.log(`  HTTP port:    ${httpPort}`);

await vault.initialize();
await rpcServer.listen();

const shutdown = () => {
  console.log("\nCES shutting down...");
  rpcServer.stop();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
