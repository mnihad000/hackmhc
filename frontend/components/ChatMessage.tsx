"use client";

import { ChatMessage as ChatMsgType } from "@/lib/types";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: ChatMsgType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
