"use client";
import { useEffect, useState } from "react";
import { ConversationList } from "@/components/ConversationList";
import { ChatPane } from "@/components/ChatPane";
import { Header } from "@/components/Header";

const DAEMON_URL = process.env.NEXT_PUBLIC_DAEMON_URL || "http://localhost:7821";

interface Conversation {
  id: string;
  title: string;
  created_at: number;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchConversations() {
    try {
      const res = await fetch(`${DAEMON_URL}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // daemon might not be running
    } finally {
      setLoading(false);
    }
  }

  async function createConversation() {
    try {
      const res = await fetch(`${DAEMON_URL}/conversation/create`, { method: "POST" });
      if (res.ok) {
        const { id } = await res.json();
        setActiveId(id);
        await fetchConversations();
      }
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header daemonUrl={DAEMON_URL} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={createConversation}
          loading={loading}
        />
        <ChatPane activeId={activeId} daemonUrl={DAEMON_URL} />
      </div>
    </div>
  );
}
