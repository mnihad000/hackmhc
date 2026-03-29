"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { ChatMessage as ChatMsgType, ChatResponse } from "@/lib/types";
import ChatMessage from "@/components/ChatMessage";
import { Send } from "lucide-react";

const STARTERS = [
  "What was my total income?",
  "Summarize my child's report card",
  "When is my child's birthday?",
  "What medical records do I have?",
];

export default function ChatPage() {
  const { token, signOut } = useAuth();
  const [messages, setMessages] = useState<ChatMsgType[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/chat/history", {}, token)
      .then((data) => setMessages(data.messages))
      .catch(async (err: any) => {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("401") || msg.includes("unauthorized")) {
          await signOut();
        }
      });
  }, [token, signOut]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !token || sending) return;

    const userMsg: ChatMsgType = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      user_id: "",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const data: ChatResponse = await apiFetch(
        "/api/chat",
        { method: "POST", body: JSON.stringify({ message: text }) },
        token
      );

      const assistantMsg: ChatMsgType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        created_at: new Date().toISOString(),
        user_id: "",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await signOut();
        return;
      }

      const errorMsg: ChatMsgType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, something went wrong: ${err.message}`,
        created_at: new Date().toISOString(),
        user_id: "",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold text-slate-900">Document Chat</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !sending && (
          <div className="text-center py-12">
            <p className="mb-6 text-slate-500">
              Ask questions about your family documents
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {sending && (
          <div className="flex items-center gap-2 pl-4 text-sm text-slate-400">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            Searching your documents...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-200 pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your documents..."
          disabled={sending}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
