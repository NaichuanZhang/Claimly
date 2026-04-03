"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { FilePreview } from "./file-preview";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

interface InputBarProps {
  onSend: (text: string) => void;
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  files: File[];
  disabled: boolean;
  initialText?: string;
}

export function InputBar({
  onSend,
  onFilesAdded,
  onFileRemove,
  files,
  disabled,
  initialText,
}: InputBarProps) {
  const [text, setText] = useState(initialText ?? "");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filterFiles = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    return arr.filter(
      (f) =>
        ACCEPTED_TYPES.includes(f.type) ||
        f.name.match(/\.(pdf|png|jpe?g|gif|webp|docx?|txt)$/i)
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    if (!text.trim() && files.length === 0) return;
    onSend(text);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [disabled, text, files.length, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        const valid = filterFiles(e.dataTransfer.files);
        if (valid.length > 0) onFilesAdded(valid);
      }
    },
    [filterFiles, onFilesAdded]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const valid = filterFiles(e.target.files);
        if (valid.length > 0) onFilesAdded(valid);
      }
      e.target.value = "";
    },
    [filterFiles, onFilesAdded]
  );

  const handleTextareaInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, []);

  // Auto-resize textarea when initialText is provided
  useEffect(() => {
    if (initialText) {
      handleTextareaInput();
    }
  }, [initialText, handleTextareaInput]);

  return (
    <div
      className={`border-t border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-4 ${isDragOver ? "drop-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((file, i) => (
            <FilePreview
              key={`${file.name}-${i}`}
              file={file}
              onRemove={() => onFileRemove(i)}
            />
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 p-2 rounded-xl text-[var(--color-text-dim)] hover:text-[var(--color-teal)] hover:bg-[var(--color-teal-light)] transition-all disabled:opacity-40"
          title="Attach files"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
          onChange={handleFileInput}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder={
            files.length > 0
              ? "Add context or press Enter to analyze..."
              : "Tell me about your situation..."
          }
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-teal-glow)] transition-all disabled:opacity-40"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && files.length === 0)}
          className="flex-shrink-0 p-2.5 rounded-xl bg-[var(--color-teal)] text-white hover:brightness-110 transition-all disabled:opacity-25 disabled:hover:brightness-100"
          title="Send"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Drop hint */}
      {isDragOver && (
        <div className="mt-2 text-center text-xs text-[var(--color-teal)] font-medium">
          Drop files here
        </div>
      )}
    </div>
  );
}
