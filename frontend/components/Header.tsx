"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDisplayName } from "@/hooks/useDisplayName";
import { LayoutDashboard, FileText, Upload, Users } from "lucide-react";

export default function Header() {
  const displayName = useDisplayName();
  const pathname = usePathname();
  const onDashboardPage = pathname === "/dashboard";
  const onDocumentsPage = pathname === "/uploadFile";
  const onUploadPage = pathname === "/documents";
  const onFamilyPage = pathname === "/family";

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-colors ${
      active
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="h-16 shrink-0 border-b border-sky-100 bg-gradient-to-r from-white via-sky-50/70 to-white px-6 backdrop-blur">
      <div className="flex h-full items-center justify-between">
        <div className="text-sm font-medium text-slate-500">FamilyOS</div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={linkClass(onDashboardPage)}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/uploadFile" className={linkClass(onDocumentsPage)}>
            <FileText size={16} />
            {displayName ? `${displayName}'s Docs` : "Documents"}
          </Link>
          <Link href="/documents" className={linkClass(onUploadPage)}>
            <Upload size={16} />
            Upload
          </Link>
          <Link href="/family" className={linkClass(onFamilyPage)}>
            <Users size={16} />
            Family
          </Link>
        </div>
      </div>
    </header>
  );
}
