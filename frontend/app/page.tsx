import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-xl font-[family-name:var(--font-display)] italic text-[var(--color-teal)]">
              Claimly
            </h1>
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-dim)] tracking-wide">
              beta
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-dim)]">
            File your claim, calmly.
          </p>
        </header>

        {/* Chat */}
        <Chat />
      </div>
    </main>
  );
}
