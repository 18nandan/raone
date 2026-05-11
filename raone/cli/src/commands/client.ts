import * as readline from "readline";
import { getInstance, readLockfile } from "../lockfile/lockfile.js";

export class ClientCommand {
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

    console.log(`Connecting to ${instance.runtimeUrl}...`);
    console.log("Type /quit to exit, /new to start a new conversation.\n");

    let conversationId: string | null = null;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const ask = () => {
      rl.question("> ", async (input) => {
        if (input === "/quit") { rl.close(); return; }
        if (input === "/new") { conversationId = null; console.log("New conversation."); ask(); return; }

        try {
          if (!conversationId) {
            const res = await fetch(`${instance.runtimeUrl}/conversation/create`, { method: "POST" });
            const data = await res.json() as { id: string };
            conversationId = data.id;
          }

          const res = await fetch(`${instance.runtimeUrl}/conversation/${conversationId}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: input }),
          });

          if (!res.ok) {
            console.error(`Error: ${res.status}`);
          } else {
            console.log("Message sent.");
          }
        } catch (err) {
          console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }

        ask();
      });
    };

    ask();
  }
}
