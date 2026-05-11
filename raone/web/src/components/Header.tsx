"use client";
import { useState, useEffect } from "react";

export function Header({ daemonUrl }: { daemonUrl: string }) {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${daemonUrl}/conversation/create`, { method: "POST" });
        setStatus(res.ok ? "online" : "offline");
      } catch {
        setStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [daemonUrl]);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px", background: "#12121a", borderBottom: "1px solid #2a2a3a",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#7c7cff" }}>raone</span>
        <span style={{ fontSize: 13, color: "#888" }}>Personal AI Assistant</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: status === "online" ? "#4ade80" : status === "offline" ? "#f87171" : "#facc15",
        }} />
        <span style={{ fontSize: 12, color: "#888" }}>
          {status === "online" ? "Daemon Online" : status === "offline" ? "Daemon Offline" : "Checking..."}
        </span>
      </div>
    </header>
  );
}
