"use client";

import { useId } from "react";
import { Info } from "lucide-react";

interface InviteFieldHelpProps {
  label: string;
  description: string;
}

export default function InviteFieldHelp({
  label,
  description,
}: InviteFieldHelpProps) {
  const tooltipId = useId();

  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`${label} help`}
        aria-describedby={tooltipId}
        className="rounded-full text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <Info aria-hidden="true" size={16} />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="invisible absolute bottom-full right-0 z-20 mb-2 w-52 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {description}
      </span>
    </span>
  );
}
