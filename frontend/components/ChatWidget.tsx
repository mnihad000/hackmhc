"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { ChatMessage, ChatResponse } from "@/lib/types";

const WELCOME_TEXT =
  "Hey, I'm Docster. Ask me about your uploaded documents and I'll search the right category for you.";

function localMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    created_at: new Date().toISOString(),
    user_id: "",
  };
}

export default function ChatWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    localMessage("assistant", WELCOME_TEXT),
  ]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasHistory = useMemo(
    () => messages.some((m) => m.user_id || m.role === "user"),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || !token || loadingHistory || hasHistory || historyFetched) return;

    setLoadingHistory(true);
    apiFetch("/api/chat/history", {}, token)
      .then((data) => {
        const history: ChatMessage[] = data.messages || [];
        if (history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          localMessage(
            "assistant",
            "I couldn't load previous chat history, but we can still chat now."
          ),
        ]);
      })
      .finally(() => {
        setHistoryFetched(true);
        setLoadingHistory(false);
      });
  }, [open, token, loadingHistory, hasHistory, historyFetched]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !token || sending) return;

    setMessages((prev) => [...prev, localMessage("user", text)]);
    setInput("");
    setSending(true);

    try {
      const data: ChatResponse = await apiFetch(
        "/api/chat",
        {
          method: "POST",
          body: JSON.stringify({ message: text }),
        },
        token
      );
      setMessages((prev) => [
        ...prev,
        localMessage("assistant", data.answer || "Sorry, something went wrong."),
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        localMessage(
          "assistant",
          "Sorry, I couldn't process that just now. Please try again."
        ),
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-light"
        aria-label={open ? "Close Docster chat" : "Open Docster chat"}
      >
        <MessageCircle size={18} />
        <span>Docster</span>
      </button>

      {open && (
        <section className="fixed bottom-20 right-5 z-50 h-[540px] w-[360px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-primary px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Docster</p>
              <p className="text-xs text-white/80">Family document assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="h-[420px] space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3">
            {loadingHistory && (
              <p className="text-xs text-gray-500">Loading history...</p>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-xl px-3 py-2 text-sm ${
                  message.role === "assistant"
                    ? "bg-gray-100 text-gray-800"
                    : "ml-auto bg-primary text-white"
                }`}
              >
                {message.content}
              </div>
            ))}

            {sending && (
              <p className="text-xs text-gray-500">Docster is searching your documents...</p>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-gray-100 p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Docster about your documents..."
              disabled={sending}
              className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
