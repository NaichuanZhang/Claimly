"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  return (
    <div className="flex flex-col gap-5">
      {messages.map((message, i) => (
        <Message
          key={message.id}
          message={message}
          isLast={i === messages.length - 1}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  );
}

function Message({
  message,
  isLast,
  isStreaming,
}: {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-enter flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`${
          isUser
            ? "max-w-[80%] bg-[var(--color-bg-user)] text-[var(--color-text-on-dark)] rounded-2xl rounded-br-sm px-4 py-3"
            : "w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        }`}
      >
        {/* Agent label */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-[var(--color-teal-light)] flex items-center justify-center">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-teal)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-[var(--color-text-dim)] tracking-wide">
              Claimly
            </span>
          </div>
        )}

        {/* Parts */}
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            if (isUser) {
              return (
                <p key={index} className="text-sm leading-relaxed">
                  {part.text}
                </p>
              );
            }
            return (
              <div key={index} className="prose-agent text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ children }) => {
                      const text =
                        typeof children === "string" ? children : "";
                      if (text === "FILE") {
                        return <span className="verdict-file">FILE</span>;
                      }
                      if (text === "DON'T FILE") {
                        return (
                          <span className="verdict-dont-file">
                            DON&apos;T FILE
                          </span>
                        );
                      }
                      return <strong>{children}</strong>;
                    },
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }

          if (
            part.type === "file" &&
            part.mediaType?.startsWith("image/")
          ) {
            return (
              <img
                key={index}
                src={part.url}
                alt={part.filename ?? "uploaded image"}
                className="max-w-48 rounded-xl border border-[var(--color-border)] mt-2"
              />
            );
          }

          if (part.type === "file") {
            return (
              <div
                key={index}
                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-warm)] text-xs"
              >
                <FileIcon />
                <span className="text-[var(--color-text-muted)]">
                  {part.filename ?? "file"}
                </span>
              </div>
            );
          }

          return null;
        })}

        {/* Streaming */}
        {!isUser && isLast && isStreaming && (
          <div className="streaming-dot mt-3">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-dim)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
