"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";

const SAMPLE_MESSAGES = [
  {
    id: "m1",
    role: "assistant",
    text: "Hey, I'm Docster. Ask me about your uploaded documents and I'll search the right category for you.",
  },
  { id: "m2", role: "user", text: "hows my 1040" },
  { id: "m3", role: "assistant", text: "Sorry, we couldn't find that in your uploaded documents." },
  { id: "m4", role: "user", text: "tell me about my algo cheatsheet" },
  { id: "m5", role: "assistant", text: "Sorry, we couldn't find that in your uploaded documents." },
] as const;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  return (
    <div className="absolute bottom-4 right-5 z-30">
      {open && (
        <section className="mb-4 w-[450px] overflow-hidden rounded-[22px] border border-zinc-300 bg-zinc-100 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="text-2xl leading-none">Docster</p>
              <p className="mt-1 text-lg leading-none text-blue-100">Family document assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-blue-100 hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="h-[430px] space-y-3 overflow-y-auto p-4">
            {SAMPLE_MESSAGES.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-[30px] leading-tight ${
                  message.role === "assistant"
                    ? "bg-zinc-200 text-zinc-800"
                    : "ml-auto bg-primary text-white"
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
            className="flex items-center gap-2 border-t border-zinc-300 bg-zinc-50 p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Docster about your documents..."
              className="h-12 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-700 outline-none"
            />
            <button
              type="submit"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500 text-white hover:bg-slate-600"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-[58px] min-w-[335px] rounded-xl border-2 border-zinc-900 bg-zinc-100 px-6 text-[46px] leading-none text-zinc-900 hover:bg-zinc-200"
      >
        Chat with us live!
      </button>
    </div>
  );
}
