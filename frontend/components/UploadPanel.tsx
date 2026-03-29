"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface UploadPanelProps {
  token: string | null;
  onUploadComplete: () => Promise<void> | void;
}

interface UploadFeedback {
  filename: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

export default function UploadPanel({ token, onUploadComplete }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadFeedback[]>([]);

  const updateStatus = (filename: string, next: UploadFeedback) => {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.filename === filename);
      if (idx === -1) {
        return [...prev, next];
      }
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (token == null || fileList == null || fileList.length === 0) return;

    const files = Array.from(fileList);

    for (const file of files) {
      updateStatus(file.name, { filename: file.name, status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await apiFetch(
          "/api/documents/upload",
          { method: "POST", body: formData },
          token
        );

        const failedEntry = Array.isArray(result.failed)
          ? result.failed.find((f: { filename?: string }) => f.filename === file.name)
          : null;

        if (failedEntry) {
          updateStatus(file.name, {
            filename: file.name,
            status: "error",
            error: failedEntry.error || "Upload failed",
          });
          continue;
        }

        updateStatus(file.name, { filename: file.name, status: "done" });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Upload failed";
        updateStatus(file.name, {
          filename: file.name,
          status: "error",
          error: message,
        });
      }
    }

    await onUploadComplete();

    setTimeout(() => setItems([]), 3500);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-2xl">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-72 w-full items-center justify-center rounded-[3rem] border-4 border-zinc-900 bg-zinc-100 text-6xl leading-none text-zinc-900 hover:bg-zinc-200"
      >
        Upload File
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(event) => handleUpload(event.target.files)}
        className="hidden"
      />

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.filename}
              className="flex items-center justify-between border border-zinc-800 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-zinc-900">{item.filename}</span>
              <span
                className={`ml-4 shrink-0 text-xs font-semibold uppercase tracking-wide ${
                  item.status === "done"
                    ? "text-zinc-900"
                    : item.status === "error"
                    ? "text-zinc-700"
                    : "text-zinc-600"
                }`}
              >
                {item.status === "error" ? item.error || "Error" : item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
