"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { FileUIPart } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { MessageList } from "./message-list";
import { InputBar } from "./input-bar";
import { FilePreview } from "./file-preview";

const DEFAULT_PROMPT =
  "Please analyze my documents and help me decide whether to file an insurance claim.";

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

function filterFiles(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter(
    (f) =>
      ACCEPTED_TYPES.includes(f.type) ||
      f.name.match(/\.(pdf|png|jpe?g|gif|webp|docx?|txt)$/i)
  );
}

interface ChatProps {
  initialPrompt?: string;
}

export function Chat({ initialPrompt }: ChatProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const fileToUIPart = useCallback(async (file: File): Promise<FileUIPart> => {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );
    return {
      type: "file",
      filename: file.name,
      mediaType: file.type as FileUIPart["mediaType"],
      url: `data:${file.type};base64,${base64}`,
    };
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() && files.length === 0) return;

      const fileParts = await Promise.all(files.map(fileToUIPart));

      sendMessage({
        text: text || DEFAULT_PROMPT,
        files: fileParts,
      });

      setFiles([]);
    },
    [files, fileToUIPart, sendMessage]
  );

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFileRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <EmptyState
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            onSend={handleSend}
            files={files}
            prompt={initialPrompt ?? DEFAULT_PROMPT}
            disabled={isStreaming}
          />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      {messages.length > 0 && (
        <InputBar
          onSend={handleSend}
          onFilesAdded={handleFilesAdded}
          onFileRemove={handleFileRemove}
          files={files}
          disabled={isStreaming}
          initialText={initialPrompt}
        />
      )}
    </div>
  );
}

function EmptyState({
  onFilesAdded,
  onFileRemove,
  onSend,
  files,
  prompt,
  disabled,
}: {
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onSend: (text: string) => void;
  files: File[];
  prompt: string;
  disabled: boolean;
}) {
  const [text, setText] = useState(prompt);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    [onFilesAdded]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const valid = filterFiles(e.target.files);
        if (valid.length > 0) onFilesAdded(valid);
      }
      e.target.value = "";
    },
    [onFilesAdded]
  );

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    if (!text.trim() && files.length === 0) return;
    onSend(text);
  }, [disabled, text, files.length, onSend]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-16">
      {/* Shield icon */}
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-teal-light)] flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>

      <div>
        <h2 className="text-lg font-[family-name:var(--font-display)] italic text-[var(--color-text)] mb-1.5">
          Should you file that claim?
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] max-w-sm leading-relaxed">
          Upload your policy, damage photos, or receipts. I&apos;ll analyze
          everything and give you a clear recommendation.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={`landing-upload-zone w-full max-w-lg ${isDragOver ? "landing-upload-zone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
          onChange={handleFileInput}
        />
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm text-[var(--color-text-dim)]">
          Drop files here or <span className="text-[var(--color-teal)] font-medium">browse</span>
        </p>
        <div className="flex gap-2 mt-2">
          {["PDF", "JPG", "PNG", "DOCX"].map((ext) => (
            <span
              key={ext}
              className="text-[9px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-dim)]"
            >
              .{ext.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg">
          {files.map((file, i) => (
            <FilePreview
              key={`${file.name}-${i}`}
              file={file}
              onRemove={() => onFileRemove(i)}
            />
          ))}
        </div>
      )}

      {/* Prompt textarea */}
      <div className="w-full max-w-lg">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={DEFAULT_PROMPT}
          rows={2}
          className="w-full resize-none bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-left placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-teal-glow)] transition-all"
        />
      </div>

      {/* Analyze button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || (!text.trim() && files.length === 0)}
        className="px-8 py-3 rounded-xl bg-[var(--color-teal)] text-white font-medium text-sm hover:brightness-110 transition-all disabled:opacity-25 disabled:hover:brightness-100"
      >
        Analyze
      </button>
    </div>
  );
}
