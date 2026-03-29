"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Document } from "@/lib/types";
import { folderLabel, formatDateYMD, normalizeCategory, uploadedByName } from "@/lib/documents";

interface DocumentsTableProps {
  token: string | null;
  documents: Document[];
  loading: boolean;
}

export default function DocumentsTable({ token, documents, loading }: DocumentsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return documents;

    return documents.filter((doc) => {
      const folderName = folderLabel(normalizeCategory(doc.category)).toLowerCase();
      return (
        doc.filename.toLowerCase().includes(trimmed) ||
        folderName.includes(trimmed)
      );
    });
  }, [documents, query]);

  const openDocument = async (documentId: string) => {
    if (!token) return;

    try {
      const data = await apiFetch(`/api/documents/${documentId}/download`, {}, token);
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Unable to open document", error);
    }
  };

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search File"
        className="mb-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none"
      />

      <div className="h-[calc(100%-4rem)] overflow-y-auto">
        <table className="w-full table-fixed border-collapse text-slate-900">
          <thead className="sticky top-0 border-b border-slate-200 bg-white">
            <tr className="text-left text-sm">
              <th className="w-[33%] pb-3 pr-4 font-semibold text-slate-600">Name</th>
              <th className="w-[22%] pb-3 pr-4 font-semibold text-slate-600">Folder Name</th>
              <th className="w-[22%] pb-3 pr-4 font-semibold text-slate-600">Date Uploaded</th>
              <th className="w-[23%] pb-3 font-semibold text-slate-600">Uploaded File From</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-5 text-lg text-zinc-500">
                  Loading files...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-5 text-lg text-zinc-500">
                  No files found.
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  onDoubleClick={() => openDocument(doc.id)}
                  className="cursor-pointer border-b border-slate-100 text-sm hover:bg-slate-100"
                  title="Double-click to open file"
                >
                  <td className="truncate py-3 pr-4">{doc.filename}</td>
                  <td className="py-3 pr-4">{folderLabel(normalizeCategory(doc.category))}</td>
                  <td className="py-3 pr-4">{formatDateYMD(doc.created_at)}</td>
                  <td className="truncate py-3">{uploadedByName(doc)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
