"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./layout";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(session ? "/documents" : "/login");
    }
  }, [session, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}
