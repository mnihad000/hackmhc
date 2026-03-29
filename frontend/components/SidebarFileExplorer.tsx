"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { Document } from "@/lib/types";

interface FolderGroup {
  id: string;
  name: string;
  files: Document[];
}

interface SidebarFileExplorerProps {
  documents: Document[];
  loading?: boolean;
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupDocuments(documents: Document[]): FolderGroup[] {
  const groups = new Map<string, FolderGroup>();

  for (const document of documents) {
    const key = document.category || "other";
    if (groups.has(key) === false) {
      groups.set(key, {
        id: key,
        name: toTitleCase(key),
        files: [],
      });
    }
    groups.get(key)?.files.push(document);
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function SidebarFileExplorer({
  documents,
  loading = false,
}: SidebarFileExplorerProps) {
  const folders = useMemo(() => groupDocuments(documents), [documents]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = { ...prev };
      for (const folder of folders) {
        if (next[folder.id] === undefined) {
          next[folder.id] = true;
        }
      }
      return next;
    });
  }, [folders]);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === true ? false : true,
    }));
  };

  return (
    <aside className="w-72 shrink-0 border-r-2 border-zinc-900 bg-zinc-50 p-4">
      <h2 className="mb-8 text-5xl leading-none text-zinc-900">[User&#39;s] OS</h2>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-8 animate-pulse border border-zinc-300 bg-zinc-100" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <p className="border border-dashed border-zinc-400 p-3 text-xs text-zinc-600">
            No files uploaded yet.
          </p>
        ) : (
          folders.map((folder) => {
            const isOpen = openFolders[folder.id] ?? true;
            return (
              <section key={folder.id} className="border border-zinc-900 bg-zinc-100/60">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="flex w-full items-center gap-2 border-b border-zinc-900 px-2 py-2 text-left text-sm font-semibold text-zinc-900"
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} />
                  <span>{folder.name}</span>
                </button>

                {isOpen && (
                  <ul className="space-y-1 px-2 py-2">
                    {folder.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center gap-2 border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
                        title={file.filename}
                      >
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">{file.filename}</span>
                      </li>
                    ))}
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
