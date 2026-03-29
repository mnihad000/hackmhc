interface HeaderProps {
  uploadLabel?: string;
}

export default function Header({ uploadLabel = "Upload File" }: HeaderProps) {
  return (
    <header className="h-14 shrink-0 border-b-2 border-zinc-900 bg-zinc-100 px-6">
      <div className="flex h-full items-center justify-between text-[34px] leading-none text-zinc-900">
        <span>[User&#39;s OS]</span>
        <span>{uploadLabel}</span>
      </div>
    </header>
  );
}
