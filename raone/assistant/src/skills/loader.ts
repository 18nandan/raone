import * as fs from "fs";
import * as path from "path";
import type { ToolDefinition, SkillManifest } from "@raoneai/service-contracts";

export class SkillLoader {
  private skillsDir: string;

  constructor(skillsDir: string) {
    this.skillsDir = skillsDir;
  }

  async loadSkillManifest(skillId: string): Promise<SkillManifest | null> {
    const manifestPath = path.join(this.skillsDir, skillId, "TOOLS.json");
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      return { id: skillId, name: skillId, tools: data.tools || [] };
    } catch {
      return null;
    }
  }

  async loadAllSkillTools(): Promise<ToolDefinition[]> {
    if (!fs.existsSync(this.skillsDir)) return [];

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    const tools: ToolDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifest = await this.loadSkillManifest(entry.name);
      if (manifest) tools.push(...manifest.tools);
    }

    return tools;
  }

  async deriveActiveSkills(conversationId: string): Promise<string[]> {
    // Placeholder: return all installed skills
    if (!fs.existsSync(this.skillsDir)) return [];
    return fs
      .readdirSync(this.skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }
}
