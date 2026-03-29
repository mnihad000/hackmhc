"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FileText, LogOut } from "lucide-react";
import { Document } from "@/lib/types";
import { groupDocumentsByFolder } from "@/lib/documents";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

interface SidebarFileExplorerProps {
  documents: Document[];
  loading?: boolean;
}

export default function SidebarFileExplorer({
  documents,
  loading = false,
}: SidebarFileExplorerProps) {
  const displayName = useDisplayName();
  const { token, signOut } = useAuth();
  const folders = useMemo(() => groupDocumentsByFolder(documents), [documents]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = { ...prev };
      for (const folder of folders) {
        if (next[folder.key] === undefined) {
          next[folder.key] = true;
        }
      }
      return next;
    });
  }, [folders]);

  const handleLogout = async () => {
    try {
      if (token) {
        await apiFetch("/api/auth/logout", { method: "POST" }, token);
      }
    } catch {
      // Always clear local auth session even if backend logout request fails.
    } finally {
      await signOut();
    }
  };

  return (
    <aside className="flex w-[305px] shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-sky-50/80 via-slate-50 to-white p-4">
      <div className="min-h-0 flex-1">
        <h2 className="mb-4 text-base font-semibold tracking-wide text-slate-900">
          {displayName ? `${displayName}'s OS` : "OS"}
        </h2>

        <div className="space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-9 animate-pulse rounded-xl border border-sky-100 bg-white"
                />
              ))}
            </div>
          ) : (
            folders.map((folder) => {
              const isOpen = openFolders[folder.key] ?? true;
              return (
                <section key={folder.key} className="rounded-xl border border-sky-100 bg-white/90">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFolders((prev) => ({
                        ...prev,
                        [folder.key]: !(prev[folder.key] ?? true),
                      }))
                    }
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Folder size={16} className="text-sky-600" />
                      {folder.label}
                    </span>
                    {isOpen ? (
                      <ChevronDown size={16} className="text-slate-500" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-500" />
                    )}
                  </button>

                  {isOpen && (
                    <ul className="space-y-1 border-t border-sky-50 px-2 py-2">
                      {folder.files.length === 0 ? (
                        <li className="rounded-lg px-2 py-1 text-xs text-slate-400">No files</li>
                      ) : (
                        folder.files.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-sky-50"
                            title={file.filename}
                          >
                            <FileText size={13} className="shrink-0 text-sky-600" />
                            <span className="truncate">{file.filename}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
