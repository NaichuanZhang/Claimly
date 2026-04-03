"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { FileUIPart } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageList } from "./message-list";
import { InputBar } from "./input-bar";

export function Chat() {
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
        text:
          text ||
          "Please analyze these documents and help me decide whether to file an insurance claim.",
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
          <EmptyState />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      <InputBar
        onSend={handleSend}
        onFilesAdded={handleFilesAdded}
        onFileRemove={handleFileRemove}
        files={files}
        disabled={isStreaming}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-24">
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
          everything and give you a clear recommendation &mdash; with the
          financial math to back it up.
        </p>
      </div>

      <div className="flex gap-2 mt-1">
        {["PDF", "JPG", "PNG", "DOCX"].map((ext) => (
          <span
            key={ext}
            className="text-[10px] font-[family-name:var(--font-mono)] px-2.5 py-1 rounded-full bg-[var(--color-bg-warm)] text-[var(--color-text-dim)]"
          >
            .{ext.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
