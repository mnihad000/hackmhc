"use client";

import "./globals.css";
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, MessageCircle, Users, LogOut } from "lucide-react";

interface AuthContext {
  session: Session | null;
  token: string | null;
  loading: boolean;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContext>({
  session: null,
  token: null,
  loading: true,
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const NAV_ITEMS = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/family", label: "Family", icon: Users },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/login");
  };

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const token = session?.access_token ?? null;

  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthCtx.Provider value={{ session, token, loading, signOut }}>
          {isAuthPage ? (
            children
          ) : (
            <div className="flex min-h-screen">
              {/* Sidebar */}
              <aside className="w-64 bg-primary text-white flex flex-col shrink-0">
                <div className="p-6">
                  <h1 className="text-xl font-bold">FamilyOS</h1>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-white/20">
                  <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors w-full"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </aside>

              {/* Main content */}
              <main className="flex-1 p-8 overflow-auto">{children}</main>
            </div>
          )}
        </AuthCtx.Provider>
      </body>
    </html>
  );
}
