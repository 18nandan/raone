#!/usr/bin/env bun
import { CommandRouter } from "./commands/router.js";

const router = new CommandRouter();
const [command, ...args] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  console.log(`raone — Personal AI Assistant

Usage:
  raone hatch [--name <name>] [--remote]  Create a new assistant
  raone wake [assistantId]                 Start the daemon + gateway
  raone sleep [assistantId]                Stop services, keep data
  raone client [assistantId]               Terminal REPL
  raone ps                                 List running assistants
  raone terminal [assistantId]             Shell into managed container
  raone retire [assistantId]               Permanently remove an assistant
  raone upgrade                            Upgrade to latest version
  raone use <name>                         Set default assistant
  raone --version                          Print version
`);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("raone 0.1.0");
  process.exit(0);
}

try {
  await router.dispatch(command, args);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
