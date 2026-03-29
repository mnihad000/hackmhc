"use client";

import DocumentsWorkspace from "@/components/DocumentsWorkspace";
import UploadPanel from "@/components/UploadPanel";
import { useAuth } from "@/components/AuthProvider";
import { useDocuments } from "@/hooks/useDocuments";

export default function DocumentsPage() {
  const { token, signOut } = useAuth();
  const { documents, loading, refreshDocuments } = useDocuments({
    token,
    onUnauthorized: signOut,
  });

  return (
    <DocumentsWorkspace documents={documents} loading={loading}>
      <div className="flex h-full items-center justify-center">
        <UploadPanel token={token} onUploadComplete={refreshDocuments} />
      </div>
    </DocumentsWorkspace>
  );
}
