"use client";

import { Document, Category } from "@/lib/types";
import { FileText, Trash2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  finance: "border-l-category-finance text-category-finance",
  education: "border-l-category-education text-category-education",
  medical: "border-l-category-medical text-category-medical",
  identity: "border-l-category-identity text-category-identity",
  legal: "border-l-category-legal text-category-legal",
  other: "border-l-category-other text-category-other",
};

const CATEGORY_BADGE: Record<string, string> = {
  finance: "bg-green-50 text-green-700",
  education: "bg-blue-50 text-blue-700",
  medical: "bg-red-50 text-red-700",
  identity: "bg-purple-50 text-purple-700",
  legal: "bg-orange-50 text-orange-700",
  other: "bg-gray-50 text-gray-700",
};

interface DocumentCardProps {
  document: Document;
  onDelete: () => void;
}

export default function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
  const borderColor = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other;
  const badgeColor = CATEGORY_BADGE[doc.category] || CATEGORY_BADGE.other;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={20} className="shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {doc.page_count ? `${doc.page_count} pages` : ""}{" "}
              {doc.profiles?.display_name
                ? `by ${doc.profiles.display_name}`
                : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
        >
          {doc.category}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(doc.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
