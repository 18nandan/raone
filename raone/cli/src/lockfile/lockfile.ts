import * as fs from "fs";
import * as path from "path";

const LOCKFILE_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".raone.lock.json"
);

export interface AssistantInstance {
  assistantId: string;
  runtimeUrl: string;
  cloud: "local" | "remote";
  hatchedAt: string;
  resources: {
    instanceDir: string;
    daemonPort: number;
    gatewayPort: number;
    qdrantPort: number;
    pidFile: string;
  };
}

export interface Lockfile {
  assistants: AssistantInstance[];
  activeAssistant: string | null;
}

export function readLockfile(): Lockfile {
  try {
    const data = fs.readFileSync(LOCKFILE_PATH, "utf-8");
    return JSON.parse(data) as Lockfile;
  } catch {
    return { assistants: [], activeAssistant: null };
  }
}

export function writeLockfile(lockfile: Lockfile): void {
  fs.writeFileSync(LOCKFILE_PATH, JSON.stringify(lockfile, null, 2), "utf-8");
}

export function getAllInstances(): AssistantInstance[] {
  return readLockfile().assistants;
}

export function getInstance(assistantId: string): AssistantInstance | undefined {
  return readLockfile().assistants.find((a) => a.assistantId === assistantId);
}

export function addInstance(instance: AssistantInstance): void {
  const lockfile = readLockfile();
  lockfile.assistants.push(instance);
  writeLockfile(lockfile);
}

export function removeInstance(assistantId: string): void {
  const lockfile = readLockfile();
  lockfile.assistants = lockfile.assistants.filter(
    (a) => a.assistantId !== assistantId
  );
  if (lockfile.activeAssistant === assistantId) {
    lockfile.activeAssistant =
      lockfile.assistants.length > 0 ? lockfile.assistants[0].assistantId : null;
  }
  writeLockfile(lockfile);
}

export function setActiveAssistant(assistantId: string): void {
  const lockfile = readLockfile();
  if (!lockfile.assistants.find((a) => a.assistantId === assistantId)) {
    throw new Error(`Assistant '${assistantId}' not found`);
  }
  lockfile.activeAssistant = assistantId;
  writeLockfile(lockfile);
}
