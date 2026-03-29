"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FileText } from "lucide-react";
import { Document } from "@/lib/types";
import { groupDocumentsByFolder } from "@/lib/documents";
import { useDisplayName } from "@/hooks/useDisplayName";

interface SidebarFileExplorerProps {
  documents: Document[];
  loading?: boolean;
}

export default function SidebarFileExplorer({
  documents,
  loading = false,
}: SidebarFileExplorerProps) {
  const displayName = useDisplayName();
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

  return (
    <aside className="w-[305px] shrink-0 border-r border-slate-200 bg-slate-50/70 p-4">
      <h2 className="mb-4 text-base font-semibold tracking-wide text-slate-900">
        {displayName ? `${displayName}'s OS` : "OS"}
      </h2>

      <div className="space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-9 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          folders.map((folder) => {
            const isOpen = openFolders[folder.key] ?? true;
            return (
              <section key={folder.key} className="rounded-xl border border-slate-200 bg-white">
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
                    <Folder size={16} />
                    {folder.label}
                  </span>
                  {isOpen ? (
                    <ChevronDown size={16} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-500" />
                  )}
                </button>

                {isOpen && (
                  <ul className="space-y-1 border-t border-slate-100 px-2 py-2">
                    {folder.files.length === 0 ? (
                      <li className="rounded-lg px-2 py-1 text-xs text-slate-400">No files</li>
                    ) : (
                      folder.files.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          title={file.filename}
                        >
                          <FileText size={13} className="shrink-0 text-slate-500" />
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
    </aside>
  );
}
