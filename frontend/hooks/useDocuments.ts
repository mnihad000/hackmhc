"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Document } from "@/lib/types";

interface UseDocumentsOptions {
  token: string | null;
  onUnauthorized: () => Promise<void>;
}

export function useDocuments({ token, onUnauthorized }: UseDocumentsOptions) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!token) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch("/api/documents", {}, token);
      setDocuments(data.documents || []);
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await onUnauthorized();
        return;
      }
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, refreshDocuments: fetchDocuments };
}
