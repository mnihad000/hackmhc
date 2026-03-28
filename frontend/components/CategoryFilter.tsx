"use client";

import { Category } from "@/lib/types";

interface CategoryFilterProps {
  categories: Category[];
  active: Category | null;
  onChange: (category: Category | null) => void;
}

export default function CategoryFilter({
  categories,
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          active === null
            ? "bg-primary text-white"
            : "bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat === active ? null : cat)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize whitespace-nowrap ${
            active === cat
              ? "bg-primary text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
