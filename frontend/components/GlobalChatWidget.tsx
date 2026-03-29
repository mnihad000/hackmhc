"use client";

import { usePathname } from "next/navigation";

import ChatWidget from "@/components/ChatWidget";
import { useAuth } from "@/components/AuthProvider";

const HIDDEN_PATHS = new Set(["/login", "/signup"]);

export default function GlobalChatWidget() {
  const pathname = usePathname();
  const { session, loading } = useAuth();

  if (loading || !session) return null;
  if (pathname && HIDDEN_PATHS.has(pathname)) return null;

  return <ChatWidget />;
}
