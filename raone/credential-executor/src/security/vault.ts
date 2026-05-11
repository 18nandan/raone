import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface StoredCredential {
  id: string;
  service: string;
  label: string;
  encryptedValue: string;
  iv: string;
  createdAt: string;
}

export class CredentialVault {
  private securityDir: string;
  private storePath: string;
  private keyPath: string;
  private masterKey: Buffer | null = null;
  private credentials: Map<string, StoredCredential> = new Map();

  constructor(securityDir: string) {
    this.securityDir = securityDir;
    this.storePath = path.join(securityDir, "keys.enc");
    this.keyPath = path.join(securityDir, "store.key");
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.securityDir)) {
      fs.mkdirSync(this.securityDir, { recursive: true });
    }

    // Load or create master key
    if (fs.existsSync(this.keyPath)) {
      this.masterKey = fs.readFileSync(this.keyPath);
    } else {
      this.masterKey = crypto.randomBytes(32);
      fs.writeFileSync(this.keyPath, this.masterKey);
      // Restrict permissions
      fs.chmodSync(this.keyPath, 0o600);
    }

    // Load encrypted store
    if (fs.existsSync(this.storePath)) {
      const encrypted = fs.readFileSync(this.storePath, "utf-8");
      const decrypted = this.decrypt(encrypted);
      const data = JSON.parse(decrypted) as StoredCredential[];
      for (const cred of data) {
        this.credentials.set(cred.id, cred);
      }
    }
  }

  async getCredential(id: string): Promise<{ id: string; value: string } | null> {
    const stored = this.credentials.get(id);
    if (!stored) return null;

    const decryptedValue = this.decryptValue(stored.encryptedValue, stored.iv);

    return {
      id: stored.id,
      value: decryptedValue,
    };
  }

  async storeCredential(service: string, label: string, value: string): Promise<string> {
    const id = crypto.randomUUID();
    const { encrypted, iv } = this.encryptValue(value);

    const credential: StoredCredential = {
      id,
      service,
      label,
      encryptedValue: encrypted,
      iv,
      createdAt: new Date().toISOString(),
    };

    this.credentials.set(id, credential);
    await this.persistStore();

    return id;
  }

  async deleteCredential(id: string): Promise<void> {
    this.credentials.delete(id);
    await this.persistStore();
  }

  private persistStore(): void {
    const data = Array.from(this.credentials.values());
    const json = JSON.stringify(data);
    const encrypted = this.encrypt(json);
    fs.writeFileSync(this.storePath, encrypted, "utf-8");
  }

  private encrypt(plaintext: string): string {
    if (!this.masterKey) throw new Error("Vault not initialized");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);
    let encrypted = cipher.update(plaintext, "utf-8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return JSON.stringify({ iv: iv.toString("hex"), authTag, data: encrypted });
  }

  private decrypt(ciphertext: string): string {
    if (!this.masterKey) throw new Error("Vault not initialized");
    const { iv, authTag, data } = JSON.parse(ciphertext);
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    let decrypted = decipher.update(data, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }

  private encryptValue(value: string): { encrypted: string; iv: string } {
    if (!this.masterKey) throw new Error("Vault not initialized");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);
    let encrypted = cipher.update(value, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return { encrypted, iv: iv.toString("hex") };
  }

  private decryptValue(encrypted: string, ivHex: string): string {
    if (!this.masterKey) throw new Error("Vault not initialized");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, Buffer.from(ivHex, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }
}
