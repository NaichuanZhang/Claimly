"use client";

import { useEffect, useState } from "react";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;

    const url = URL.createObjectURL(file);
    setThumbnail(url);

    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-warm)] border border-[var(--color-border)]">
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={file.name}
          className="w-8 h-8 rounded-lg object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center">
          <span className="text-[9px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-teal)] uppercase">
            {file.name.split(".").pop()}
          </span>
        </div>
      )}

      <span className="text-xs text-[var(--color-text-muted)] max-w-32 truncate">
        {file.name}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
