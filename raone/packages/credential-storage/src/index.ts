import { z } from "zod";

export const CredentialSchema = z.object({
  id: z.string(),
  service: z.string(),
  label: z.string(),
  encryptedValue: z.string(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
});

export type Credential = z.infer<typeof CredentialSchema>;

export interface CredentialStore {
  save(credential: Credential): Promise<void>;
  get(id: string): Promise<Credential | null>;
  delete(id: string): Promise<void>;
  list(): Promise<Credential[]>;
}

export class AesEncryptedCredentialStore implements CredentialStore {
  private store: Map<string, Credential> = new Map();

  async save(credential: Credential): Promise<void> {
    this.store.set(credential.id, credential);
  }

  async get(id: string): Promise<Credential | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async list(): Promise<Credential[]> {
    return Array.from(this.store.values());
  }
}
