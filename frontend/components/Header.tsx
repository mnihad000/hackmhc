"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDisplayName } from "@/hooks/useDisplayName";

export default function Header() {
  const displayName = useDisplayName();
  const pathname = usePathname();
  const onUsersOsPage = pathname === "/uploadFile";
  const onUploadFilePage = pathname === "/documents";

  const linkClass = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-colors ${
      active
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="h-16 shrink-0 border-b border-sky-100 bg-gradient-to-r from-white via-sky-50/70 to-white px-6 backdrop-blur">
      <div className="flex h-full items-center justify-between">
        <div className="text-sm font-medium text-slate-500">FamilyOS</div>
        <div className="flex items-center gap-3">
        <Link href="/uploadFile" className={linkClass(onUsersOsPage)}>
          {displayName ? `${displayName}'s OS` : "OS"}
        </Link>
        <Link href="/documents" className={linkClass(onUploadFilePage)}>
          Upload File
        </Link>
        </div>
      </div>
    </header>
  );
}
