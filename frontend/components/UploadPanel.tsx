"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface UploadPanelProps {
  token: string | null;
  onUploadComplete: () => Promise<void> | void;
}

type UploadState = "uploading" | "done" | "error";

interface UploadFeedback {
  filename: string;
  status: UploadState;
  category?: string;
  error?: string;
}

export default function UploadPanel({ token, onUploadComplete }: UploadPanelProps) {
  const [items, setItems] = useState<UploadFeedback[]>([]);

  const updateStatus = (filename: string, next: UploadFeedback) => {
    setItems((prev) => {
      const index = prev.findIndex((entry) => entry.filename === filename);
      if (index === -1) {
        return [...prev, next];
      }
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const uploadFiles = async (files: File[]) => {
    if (!token || files.length === 0) return;

    for (const file of files) {
      updateStatus(file.name, { filename: file.name, status: "uploading" });

      try {
        const body = new FormData();
        body.append("file", file);

        const result = await apiFetch(
          "/api/documents/upload",
          { method: "POST", body },
          token
        );

        const failedEntry = Array.isArray(result.failed)
          ? result.failed.find((entry: { filename?: string }) => entry.filename === file.name)
          : null;

        if (failedEntry) {
          updateStatus(file.name, {
            filename: file.name,
            status: "error",
            error: failedEntry.error || "Upload failed",
          });
          continue;
        }

        updateStatus(file.name, {
          filename: file.name,
          status: "done",
          category: result.category,
        });
      } catch (error: unknown) {
        updateStatus(file.name, {
          filename: file.name,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    await onUploadComplete();
    setTimeout(() => setItems([]), 3500);
  };

  const dropzone = useDropzone({
    onDrop: (acceptedFiles) => uploadFiles(acceptedFiles),
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const panelClass = useMemo(() => {
    if (dropzone.isDragActive) {
      return "border-slate-500 bg-slate-100";
    }
    return "border-slate-300 bg-slate-50 hover:bg-slate-100";
  }, [dropzone.isDragActive]);

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <div
        {...dropzone.getRootProps()}
        className={`flex h-[62vh] min-h-[420px] w-full cursor-pointer items-center justify-center rounded-3xl border-2 border-dashed ${panelClass}`}
      >
        <input {...dropzone.getInputProps()} />
        <div className="flex flex-col items-center text-center text-zinc-900">
          <UploadCloud size={56} className="mb-4 text-slate-400" />
          <p className="text-5xl font-semibold leading-none">Upload File</p>
          <p className="mt-3 text-sm text-slate-600">Drag and drop PDFs or click to upload</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.filename}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-zinc-900">{item.filename}</span>
              <span className="ml-3 shrink-0 text-xs uppercase tracking-wide text-zinc-700">
                {item.status}
                {item.category ? ` - ${item.category}` : ""}
                {item.error ? ` - ${item.error}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
