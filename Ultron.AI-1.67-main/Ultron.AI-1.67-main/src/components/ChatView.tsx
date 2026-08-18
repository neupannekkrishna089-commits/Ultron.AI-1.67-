import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Attachment, Conversation } from "~/lib/ultron";
import { formatSize, formatTime } from "~/lib/ultron";
import {
  IconMic,
  IconPaperclip,
  IconSend,
  IconX,
  ULTRONMark,
} from "~/components/icons";

type ChatViewProps = {
  conversation: Conversation;
  listening: boolean;
  pendingFile: Attachment | null;
  replying: boolean;
  shortcutLabel: string;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (text: string) => void;
  onToggleListening: () => void;
  onPickFile: () => void;
  onClearFile: () => void;
};

const SUGGESTIONS = ["Plan my day", "Draft a reply to Sam", "Explain a concept simply"];

export function ChatView({
  conversation,
  listening,
  pendingFile,
  replying,
  shortcutLabel,
  composerRef,
  onSend,
  onToggleListening,
  onPickFile,
  onClearFile,
}: ChatViewProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messageCount = conversation.messages.length;

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, replying, conversation.id]);

  const canSend = text.trim().length > 0 || pendingFile !== null;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
    if (composerRef.current) composerRef.current.style.height = "auto";
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-graphite-950">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-graphite-700/70 bg-graphite-900/60 px-5">
        <div className="min-w-0">
          <h1 className="truncate text-[13.5px] font-medium text-ink">{conversation.title}</h1>
          <p className="truncate text-[11px] text-ink-muted">
            UI preview · replies are local placeholders, not AI
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-800 px-2.5 py-1 text-[10.5px] font-medium text-ink-muted">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-crimson" />
          Local preview
        </span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="ultron-scroll min-h-0 flex-1 overflow-y-auto">
        {messageCount === 0 ? (
          <EmptyState onSuggestion={(s) => onSend(s)} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
            {conversation.messages.map((m) => {
              const user = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={
                    "flex w-full animate-fade-up items-end gap-2.5 " +
                    (user ? "justify-end" : "justify-start")
                  }
                >
                  {!user && <ULTRONMark size={22} className="mb-4" />}
                  <div className={"flex max-w-[78%] flex-col gap-1 " + (user ? "items-end" : "items-start")}>
                    <div
                      className={
                        "rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed " +
                        (user
                          ? "rounded-br-md border border-crimson/20 bg-crimson/15 text-ink"
                          : "rounded-bl-md border border-graphite-700 bg-graphite-800 text-ink/95")
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      {m.attachment && (
                        <span className="mt-2 flex w-fit items-center gap-1.5 rounded-md bg-black/25 px-2 py-1 text-[11px] text-ink/90">
                          <IconPaperclip size={11} className="text-crimson" />
                          <span className="max-w-[220px] truncate">{m.attachment.name}</span>
                          <span className="text-ink-muted">{formatSize(m.attachment.size)}</span>
                        </span>
                      )}
                    </div>
                    <span className={"px-0.5 text-[10.5px] text-ink-muted/60"}>
                      {formatTime(m.at)}
                    </span>
                  </div>
                </div>
              );
            })}

            {replying && (
              <div className="flex w-full animate-fade-up items-end gap-2.5">
                <ULTRONMark size={22} />
                <div className="rounded-xl rounded-bl-md border border-graphite-700 bg-graphite-800 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-ink-muted">
                      ULTRON is listening
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-typing rounded-full bg-crimson" />
                      <span
                        className="h-1.5 w-1.5 animate-typing rounded-full bg-crimson"
                        style={{ animationDelay: "0.18s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-typing rounded-full bg-crimson"
                        style={{ animationDelay: "0.36s" }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-graphite-700/70 bg-graphite-900/60 px-4 pb-3.5 pt-3">
        {listening && (
          <div className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-2.5 rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2">
            <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
              <span className="eq-bar w-[3px] rounded-full bg-crimson" />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.15s" }} />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.3s" }} />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.45s" }} />
            </span>
            <span className="text-[12px] text-ink/90">
              Listening… <span className="text-ink-muted">(visual preview only — no audio is captured)</span>
            </span>
          </div>
        )}

        <div
          className={
            "mx-auto w-full max-w-3xl rounded-xl border bg-graphite-800 px-2 py-1.5 transition-all duration-150 ease-out " +
            (listening
              ? "border-crimson/50 ring-2 ring-crimson/15"
              : "border-graphite-700 focus-within:border-crimson/50 focus-within:ring-2 focus-within:ring-crimson/10")
          }
        >
          {pendingFile && (
            <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-graphite-700/80 px-2 py-1 text-[11.5px] text-ink/90">
              <IconPaperclip size={11.5} className="shrink-0 text-crimson" />
              <span className="max-w-[240px] truncate">{pendingFile.name}</span>
              <span className="shrink-0 text-ink-muted">{formatSize(pendingFile.size)}</span>
              <button
                type="button"
                onClick={onClearFile}
                aria-label="Remove attachment"
                className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-graphite-600 hover:text-ink"
              >
                <IconX size={11} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-0.5">
            <button
              type="button"
              onClick={onPickFile}
              title="Attach a file"
              aria-label="Attach a file"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 ease-out hover:bg-graphite-700 hover:text-ink"
            >
              <IconPaperclip size={16} />
            </button>
            <textarea
              ref={composerRef}
              value={text}
              rows={1}
              onChange={(e) => {
                setText(e.target.value);
                grow(e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Message ULTRON…"
              aria-label="Message ULTRON"
              className="ultron-scroll max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/60"
            />
            <button
              type="button"
              onClick={onToggleListening}
              title={listening ? "Stop listening" : "Listen (preview)"}
              aria-label={listening ? "Stop listening" : "Start listening (preview)"}
              aria-pressed={listening}
              className={
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ease-out " +
                (listening
                  ? "bg-crimson/15 text-crimson"
                  : "text-ink-muted hover:bg-graphite-700 hover:text-ink")
              }
            >
              {listening && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-lg bg-crimson/25" />
              )}
              <IconMic size={16} className="relative" />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title="Send"
              aria-label="Send message"
              className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-crimson text-white transition-all duration-150 ease-out hover:bg-crimson-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-graphite-700 disabled:text-ink-muted/40"
              style={canSend ? { boxShadow: "0 0 16px rgba(220, 30, 58, 0.3)" } : undefined}
            >
              <IconSend size={14} />
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 w-full max-w-3xl text-center text-[10.5px] text-ink-muted/60">
          Enter to send · Shift+Enter for a new line · {shortcutLabel} to focus the composer
        </p>
      </div>
    </main>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <ULTRONMark size={44} />
        <h2 className="text-[17px] font-semibold text-ink">How can I help you today?</h2>
        <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
          This is the ULTRON interface preview. Try a suggestion below — replies are local
          placeholders until AI ships.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="rounded-lg border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-[12.5px] text-ink/90 transition-colors duration-150 ease-out hover:border-crimson/50 hover:bg-crimson/10 hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
