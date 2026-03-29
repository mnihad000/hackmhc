"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { Document, CATEGORIES, Category } from "@/lib/types";
import FileUpload from "@/components/FileUpload";
import DocumentCard from "@/components/DocumentCard";
import CategoryFilter from "@/components/CategoryFilter";

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const params = activeCategory ? `?category=${activeCategory}` : "";
      const data = await apiFetch(`/api/documents${params}`, {}, token);
      setDocuments(data.documents);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [token, activeCategory]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadComplete = () => {
    fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" }, token!);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Documents</h2>

      {/* Upload Zone */}
      <FileUpload token={token} onUploadComplete={handleUploadComplete} />

      {/* Category Filter */}
      <CategoryFilter
        categories={CATEGORIES}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No documents yet</p>
          <p className="text-sm mt-1">Upload your first family document above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
