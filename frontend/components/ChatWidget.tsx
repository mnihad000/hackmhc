"use client";

import { useState } from "react";
import { X } from "lucide-react";

const SAMPLE_MESSAGES = [
  { id: "1", role: "assistant", text: "Hi there. Need help with your forms?" },
  { id: "2", role: "user", text: "Can you check what I uploaded?" },
  { id: "3", role: "assistant", text: "I can help once chat is connected." },
] as const;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => (prev ? false : true))}
        className="fixed bottom-6 right-6 z-30 border-2 border-zinc-900 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
      >
        Chat with us live!
      </button>

      {open && (
        <section className="fixed bottom-20 right-6 z-30 w-[380px] border-2 border-zinc-900 bg-zinc-50">
          <div className="flex items-center justify-between border-b-2 border-zinc-900 bg-zinc-100 px-3 py-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-900">Live Chat</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-zinc-700 hover:text-zinc-900">
              <X size={16} />
            </button>
          </div>

          <div className="h-64 space-y-2 overflow-y-auto border-b border-zinc-900 p-3">
            {SAMPLE_MESSAGES.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] border border-zinc-900 px-2 py-1 text-sm ${
                  message.role === "assistant"
                    ? "bg-white text-zinc-900"
                    : "ml-auto bg-zinc-200 text-zinc-900"
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setInput("");
            }}
            className="flex items-center gap-2 p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message"
              className="h-10 flex-1 border border-zinc-900 bg-white px-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="h-10 border border-zinc-900 bg-zinc-200 px-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-300"
            >
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
