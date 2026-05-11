export interface EgressProxySession {
  id: string;
  targetUrl: string;
  createdAt: Date;
  isActive: boolean;
}

export class EgressProxyManager {
  private sessions: Map<string, EgressProxySession> = new Map();

  createSession(targetUrl: string): EgressProxySession {
    const session: EgressProxySession = {
      id: crypto.randomUUID(),
      targetUrl,
      createdAt: new Date(),
      isActive: true,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): EgressProxySession | null {
    return this.sessions.get(id) ?? null;
  }

  closeSession(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.isActive = false;
    }
  }
}
