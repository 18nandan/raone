"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: number;
}

interface Props {
  activeId: string | null;
  daemonUrl: string;
}

export function ChatPane({ activeId, daemonUrl }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Connect SSE when active conversation changes
  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreamingContent("");

    if (!activeId) return;

    const es = new EventSource(`${daemonUrl}/conversation/${activeId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "text_delta") {
          setStreamingContent((prev) => prev + data.delta);
        } else if (data.type === "message_complete") {
          setStreamingContent("");
          loadMessages(activeId);
        } else if (data.type === "conversation_error") {
          setStreamingContent("");
        }
      } catch {}
    };

    loadMessages(activeId);

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [activeId, daemonUrl]);

  async function loadMessages(conversationId: string) {
    try {
      const res = await fetch(`${daemonUrl}/conversation/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || !activeId || sending) return;
    setSending(true);
    const text = input;
    setInput("");

    try {
      const res = await fetch(`${daemonUrl}/conversation/${activeId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        await loadMessages(activeId);
      }
    } catch (err) {
      console.error("Send error", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!activeId) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        color: "#555", fontSize: 16,
      }}>
        Select a conversation or start a new one
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, flexShrink: 0,
              background: m.role === "user" ? "#2a2a5a" : "#7c7cff",
              color: "#fff",
            }}>
              {m.role === "user" ? "U" : "R"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                {m.role === "user" ? "You" : "raone"}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {streamingContent && (
          <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, flexShrink: 0,
              background: "#7c7cff", color: "#fff",
            }}>R</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>raone</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {streamingContent}
                <span style={{ animation: "blink 1s infinite" }}>|</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid #2a2a3a", background: "#0e0e16" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #2a2a3a",
              background: "#12121a", color: "#e4e4ef", fontSize: 14, resize: "none",
              outline: "none", fontFamily: "inherit",
            }}
            disabled={sending}
          />
          <button onClick={sendMessage} disabled={sending || !input.trim()} style={{
            padding: "10px 20px", background: sending ? "#555" : "#7c7cff", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
          }}>
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  );
}
