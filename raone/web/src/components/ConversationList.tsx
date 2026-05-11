"use client";

interface Conversation {
  id: string;
  title: string;
  created_at: number;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, onCreate, loading }: Props) {
  return (
    <div style={{
      width: 280, minWidth: 280, background: "#0e0e16", borderRight: "1px solid #2a2a3a",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #2a2a3a" }}>
        <button onClick={onCreate} style={{
          width: "100%", padding: "10px 16px", background: "#7c7cff", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + New Conversation
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        {loading ? (
          <div style={{ padding: 16, color: "#666", textAlign: "center", fontSize: 13 }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 16, color: "#666", textAlign: "center", fontSize: 13 }}>
            No conversations yet
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                padding: "10px 12px", borderRadius: 6, marginBottom: 4, cursor: "pointer",
                fontSize: 14, transition: "background 0.15s",
                background: activeId === c.id ? "#1a1a2e" : "transparent",
                color: activeId === c.id ? "#7c7cff" : "#bbb",
              }}
              onMouseEnter={(e) => { if (activeId !== c.id) e.currentTarget.style.background = "#151525"; }}
              onMouseLeave={(e) => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
            >
              {c.title || "New conversation"}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
