"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

function firstName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const token = trimmed.split(/\s+/)[0];
  return token;
}

export function useDisplayName() {
  const { session, token, loading } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");

  const metadataFirstName = useMemo(() => {
    const fromMetadata =
      (session?.user?.user_metadata?.display_name as string | undefined) ||
      (session?.user?.user_metadata?.name as string | undefined);
    return fromMetadata ? firstName(fromMetadata) : "";
  }, [session]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (metadataFirstName) {
      setDisplayName(metadataFirstName);
      return;
    }

    // Keep empty while profile lookup resolves to avoid visible label flicker.
    setDisplayName("");
  }, [loading, metadataFirstName]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !token || !userId) return;

    let cancelled = false;

    apiFetch("/api/family", {}, token)
      .then((data) => {
        if (cancelled) return;
        const members = Array.isArray(data?.members) ? data.members : [];
        const currentMember = members.find((member: { id?: string }) => member.id === userId);
        const fromProfile = firstName(String(currentMember?.display_name || ""));
        if (fromProfile) {
          setDisplayName(fromProfile);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (metadataFirstName) {
          setDisplayName(metadataFirstName);
          return;
        }

        setDisplayName("");
      });

    return () => {
      cancelled = true;
    };
  }, [loading, metadataFirstName, session, token]);

  return displayName;
}
