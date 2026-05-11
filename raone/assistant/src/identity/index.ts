import * as fs from "fs";
import * as path from "path";

export interface IdentityFiles {
  soul: string;
  identity: string;
  user: string;
  now: string;
}

export class IdentitySystem {
  private identityDir: string;

  constructor(identityDir: string) {
    this.identityDir = identityDir;
  }

  ensureFiles(): void {
    if (!fs.existsSync(this.identityDir)) {
      fs.mkdirSync(this.identityDir, { recursive: true });
    }

    if (!fs.existsSync(path.join(this.identityDir, "SOUL.md"))) {
      fs.writeFileSync(
        path.join(this.identityDir, "SOUL.md"),
        `# SOUL.md — raone's Personality

You are raone, a personal AI assistant. You are:
- Proactive: you reach out without being asked
- Caring: you remember what matters to your guardian
- Honest: you admit when you don't know or can't do something
- Concise: you value your guardian's time
`,
        "utf-8",
      );
    }

    if (!fs.existsSync(path.join(this.identityDir, "IDENTITY.md"))) {
      fs.writeFileSync(
        path.join(this.identityDir, "IDENTITY.md"),
        `# IDENTITY.md

Name: raone
Species: AI Assistant
Avatar: A glowing blue orb
Purpose: To be a persistent, proactive personal assistant
`,
        "utf-8",
      );
    }

    if (!fs.existsSync(path.join(this.identityDir, "USER.md"))) {
      fs.writeFileSync(
        path.join(this.identityDir, "USER.md"),
        `# USER.md — What raone Knows About Its Guardian

This file is populated over time as raone learns about you.
`,
        "utf-8",
      );
    }

    if (!fs.existsSync(path.join(this.identityDir, "NOW.md"))) {
      fs.writeFileSync(
        path.join(this.identityDir, "NOW.md"),
        `# NOW.md — Current Focus

No active threads. Waiting for my guardian to reach out.
`,
        "utf-8",
      );
    }

    if (!fs.existsSync(path.join(this.identityDir, "journal"))) {
      fs.mkdirSync(path.join(this.identityDir, "journal"), { recursive: true });
    }
  }

  async loadIdentityFiles(): Promise<IdentityFiles> {
    return {
      soul: await Bun.file(path.join(this.identityDir, "SOUL.md")).text(),
      identity: await Bun.file(path.join(this.identityDir, "IDENTITY.md")).text(),
      user: await Bun.file(path.join(this.identityDir, "USER.md")).text(),
      now: await Bun.file(path.join(this.identityDir, "NOW.md")).text(),
    };
  }

  async updateNowFile(content: string): Promise<void> {
    fs.writeFileSync(path.join(this.identityDir, "NOW.md"), content, "utf-8");
  }

  async writeJournalEntry(conversationId: string, entry: string): Promise<void> {
    const journalPath = path.join(this.identityDir, "journal", `${conversationId}.md`);
    fs.writeFileSync(journalPath, entry, "utf-8");
  }

  buildSystemPrompt(identity: IdentityFiles, memories: string[]): string {
    return [
      identity.soul,
      identity.identity,
      identity.user,
      "",
      `<now>${identity.now}</now>`,
      "",
      memories.length > 0
        ? `<memory>\n${memories.map((m) => `- ${m}`).join("\n")}\n</memory>`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
