import { ReactNode } from "react";
import Header from "@/components/Header";
import SidebarFileExplorer from "@/components/SidebarFileExplorer";
import { Document } from "@/lib/types";

interface DocumentsWorkspaceProps {
  documents: Document[];
  loading: boolean;
  children: ReactNode;
}

export default function DocumentsWorkspace({
  documents,
  loading,
  children,
}: DocumentsWorkspaceProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 p-4">
      <div className="mx-auto flex h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Header />

        <div className="flex min-h-0 flex-1">
          <SidebarFileExplorer documents={documents} loading={loading} />

          <main className="relative min-w-0 flex-1 overflow-hidden">
            <div className="h-full overflow-hidden px-8 pb-16 pt-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
