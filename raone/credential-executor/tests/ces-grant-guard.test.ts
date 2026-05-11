import { describe, it, expect, beforeEach } from "bun:test";
import { CredentialVault } from "../src/security/vault.ts";
import { GrantManager } from "../src/grants/manager.ts";

describe("CES Grant System", () => {
  let vault: CredentialVault;
  let grantManager: GrantManager;

  beforeEach(() => {
    vault = new CredentialVault("/tmp/ces-test");
    grantManager = new GrantManager(vault);
  });

  it("should create and validate grants", () => {
    const grant = grantManager.createGrant("cred-1");
    expect(grant).not.toBeNull();
    expect(grant!.expired).toBe(false);

    const valid = grantManager.validateGrant(grant!.id);
    expect(valid).toBe(true);
  });

  it("should revoke grants", () => {
    const grant = grantManager.createGrant("cred-1");
    grantManager.revokeGrant(grant!.id);

    const valid = grantManager.validateGrant(grant!.id);
    expect(valid).toBe(false);
  });

  it("should maintain audit log", () => {
    const grant = grantManager.createGrant("cred-1");
    grantManager.revokeGrant(grant!.id);

    const log = grantManager.getAuditLog();
    expect(log.length).toBe(2);
    expect(log[0].action).toBe("grant_created");
    expect(log[1].action).toBe("grant_revoked");
  });
});
