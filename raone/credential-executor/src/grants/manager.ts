import { CredentialVault } from "../security/vault.js";

interface Grant {
  id: string;
  credentialId: string;
  createdAt: Date;
  expired: boolean;
}

export class GrantManager {
  private vault: CredentialVault;
  private grants: Map<string, Grant> = new Map();
  private auditLog: Array<{ grantId: string; credentialId: string; action: string; timestamp: Date }> = [];

  constructor(vault: CredentialVault) {
    this.vault = vault;
  }

  createGrant(credentialId: string): Grant | null {
    const grant: Grant = {
      id: crypto.randomUUID(),
      credentialId,
      createdAt: new Date(),
      expired: false,
    };

    this.grants.set(grant.id, grant);
    this.auditLog.push({
      grantId: grant.id,
      credentialId,
      action: "grant_created",
      timestamp: new Date(),
    });

    return grant;
  }

  revokeGrant(grantId: string): void {
    const grant = this.grants.get(grantId);
    if (grant) {
      grant.expired = true;
      this.auditLog.push({
        grantId,
        credentialId: grant.credentialId,
        action: "grant_revoked",
        timestamp: new Date(),
      });
    }
  }

  validateGrant(grantId: string): boolean {
    const grant = this.grants.get(grantId);
    if (!grant || grant.expired) return false;

    // Grants expire after 5 minutes
    const age = Date.now() - grant.createdAt.getTime();
    if (age > 5 * 60 * 1000) {
      this.revokeGrant(grantId);
      return false;
    }

    return true;
  }

  getAuditLog(): Array<{ grantId: string; credentialId: string; action: string; timestamp: Date }> {
    return [...this.auditLog];
  }
}
