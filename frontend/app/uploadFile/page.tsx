"use client";

import DocumentsWorkspace from "@/components/DocumentsWorkspace";
import DocumentsTable from "@/components/DocumentsTable";
import { useAuth } from "@/components/AuthProvider";
import { useDocuments } from "@/hooks/useDocuments";

export default function UploadFilePage() {
  const { token, signOut } = useAuth();
  const { documents, loading } = useDocuments({
    token,
    onUnauthorized: signOut,
  });

  return (
    <DocumentsWorkspace documents={documents} loading={loading}>
      <DocumentsTable token={token} documents={documents} loading={loading} />
    </DocumentsWorkspace>
  );
}
