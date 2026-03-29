import { Document } from "@/lib/types";

export type FolderKey = "finance" | "education" | "medical" | "misc";

const FOLDER_ORDER: FolderKey[] = ["finance", "education", "medical", "misc"];

export function normalizeCategory(rawCategory?: string): FolderKey {
  const value = (rawCategory || "").trim().toLowerCase();

  if (value === "finance") return "finance";
  if (value === "education") return "education";
  if (value === "medical") return "medical";
  return "misc";
}

export function folderLabel(folder: FolderKey): string {
  if (folder === "misc") return "Misc/Other";
  return folder.charAt(0).toUpperCase() + folder.slice(1);
}

export function groupDocumentsByFolder(documents: Document[]) {
  const grouped: Record<FolderKey, Document[]> = {
    finance: [],
    education: [],
    medical: [],
    misc: [],
  };

  for (const doc of documents) {
    grouped[normalizeCategory(doc.category)].push(doc);
  }

  return FOLDER_ORDER.map((folder) => ({
    key: folder,
    label: folderLabel(folder),
    files: grouped[folder],
  }));
}

export function formatDateYMD(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toISOString().slice(0, 10);
}

export function uploadedByName(document: Document): string {
  return document.profiles?.display_name || document.uploaded_by || "Unknown";
}
