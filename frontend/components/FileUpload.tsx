"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface FileUploadProps {
  token: string | null;
  onUploadComplete: () => void;
}

interface UploadStatus {
  filename: string;
  status: "uploading" | "done" | "error";
  category?: string;
  error?: string;
}

export default function FileUpload({ token, onUploadComplete }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!token) return;

      for (const file of acceptedFiles) {
        setUploads((prev) => [
          ...prev,
          { filename: file.name, status: "uploading" },
        ]);

        try {
          const formData = new FormData();
          formData.append("file", file);

          const result = await apiFetch(
            "/api/documents/upload",
            { method: "POST", body: formData },
            token
          );

          setUploads((prev) =>
            prev.map((u) =>
              u.filename === file.name
                ? { ...u, status: "done", category: result.category }
                : u
            )
          );
        } catch (err: any) {
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === file.name
                ? { ...u, status: "error", error: err.message }
                : u
            )
          );
        }
      }

      onUploadComplete();

      // Clear upload statuses after 5 seconds
      setTimeout(() => setUploads([]), 5000);
    },
    [token, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="mb-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mx-auto mb-3 ${
            isDragActive ? "text-primary" : "text-gray-400"
          }`}
          size={32}
        />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop PDFs here</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">
              Drop PDFs here or click to upload
            </p>
            <p className="text-gray-400 text-sm mt-1">
              W-2s, birth certificates, report cards, medical records...
            </p>
          </div>
        )}
      </div>

      {/* Upload statuses */}
      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploads.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-white rounded-lg border"
            >
              {u.status === "uploading" && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {u.status === "done" && (
                <CheckCircle size={16} className="text-green-500" />
              )}
              {u.status === "error" && (
                <AlertCircle size={16} className="text-red-500" />
              )}
              <span className="flex-1 truncate">{u.filename}</span>
              {u.category && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                  {u.category}
                </span>
              )}
              {u.error && (
                <span className="text-xs text-red-500">{u.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
