import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Attachment, Conversation, InteractionMode, VoiceSettings } from "~/lib/ultron";
import { formatSize, formatTime } from "~/lib/ultron";
import {
  IconMic,
  IconPaperclip,
  IconPlay,
  IconSend,
  IconStopCircle,
  IconType,
  IconWaveform,
  IconX,
  ULTRONMark,
} from "~/components/icons";

type ChatViewProps = {
  conversation: Conversation;
  voiceSettings: VoiceSettings;
  text: string;
  onTextChange: (text: string) => void;
  listening: boolean;
  micError: string | null;
  speakingId: string | null;
  ttsError: string | null;
  sttSupported: boolean;
  ttsSupported: boolean;
  pendingFile: Attachment | null;
  replying: boolean;
  shortcutLabel: string;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (text: string) => void;
  onToggleListening: () => void;
  onPickFile: () => void;
  onClearFile: () => void;
  onModeChange: (mode: InteractionMode) => void;
  onReplay: (id: string, text: string) => void;
  onStopSpeaking: () => void;
};

const SUGGESTIONS = ["Plan my day", "Draft a reply to Sam", "Explain a concept simply"];

const MODES: { id: InteractionMode; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "voice", label: "Voice" },
  { id: "mixed", label: "Mixed" },
];

export function ChatView({
  conversation,
  voiceSettings,
  text,
  onTextChange,
  listening,
  micError,
  speakingId,
  ttsError,
  sttSupported,
  ttsSupported,
  pendingFile,
  replying,
  shortcutLabel,
  composerRef,
  onSend,
  onToggleListening,
  onPickFile,
  onClearFile,
  onModeChange,
  onReplay,
  onStopSpeaking,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageCount = conversation.messages.length;
  const mode = voiceSettings.mode;
  const micAvailable = mode !== "text" && voiceSettings.micEnabled && sttSupported;
  const canReplay = voiceSettings.speechOutputEnabled && ttsSupported;

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, replying, conversation.id]);

  // Resize the composer to fit content whenever its value changes externally
  // (e.g. filled in by dictation) as well as by typing.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text, composerRef]);

  const canSend = text.trim().length > 0 || pendingFile !== null;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    onTextChange("");
  };

  return (
    <main className="ultron-canvas flex h-full min-w-0 flex-1 flex-col">
      {/* Header */}
      <header className="ultron-glass flex h-14 shrink-0 items-center justify-between gap-4 border-b border-graphite-700/60 px-6">
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-medium text-ink">{conversation.title}</h1>
          <p className="truncate text-[11px] text-ink-muted">
            UI preview · replies are local placeholders, not AI
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* Mode switcher */}
          <div className="flex items-center rounded-[9px] border border-graphite-700 bg-graphite-900/60 p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                aria-pressed={mode === m.id}
                className={
                  "rounded-[7px] px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150 ease-out " +
                  (mode === m.id
                    ? "bg-graphite-700 text-ink"
                    : "text-ink-muted hover:text-ink-soft")
                }
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-graphite-700 px-2.5 py-1 text-[10.5px] font-medium text-ink-muted">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-crimson" />
            Local preview
          </span>
        </div>
      </header>

      {(micError || ttsError) && (
        <div className="ultron-glass flex shrink-0 items-center gap-2 border-b border-crimson/20 bg-crimson-soft/25 px-6 py-1.5 text-[11.5px] text-crimson">
          {micError ?? ttsError}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="ultron-scroll min-h-0 flex-1 overflow-y-auto">
        {messageCount === 0 ? (
          <EmptyState onSuggestion={(s) => onSend(s)} />
        ) : (
          <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-5 px-6 py-7">
            {conversation.messages.map((m) => {
              const user = m.role === "user";
              const speaking = speakingId === m.id;
              return (
                <div
                  key={m.id}
                  className={
                    "flex w-full animate-fade-up items-end gap-2.5 " +
                    (user ? "justify-end" : "justify-start")
                  }
                >
                  {!user && <ULTRONMark size={24} className="mb-5" />}
                  <div className={"flex max-w-[75%] flex-col gap-1 " + (user ? "items-end" : "items-start")}>
                    <div
                      className={
                        "rounded-[14px] px-4 py-2.5 text-[13.5px] leading-relaxed " +
                        (user
                          ? "rounded-br-[5px] border-r-2 border-crimson bg-graphite-800 text-ink"
                          : "rounded-bl-[5px] bg-graphite-850/70 text-ink-soft ultron-elevate")
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
                    <span className="flex items-center gap-1.5 px-1 text-[10.5px] text-ink-muted/60">
                      {user && m.via === "voice" && <IconMic size={10} className="text-ink-muted/60" />}
                      {formatTime(m.at)}
                      {!user && canReplay && (
                        <button
                          type="button"
                          onClick={() => (speaking ? onStopSpeaking() : onReplay(m.id, m.text))}
                          title={speaking ? "Stop speaking" : "Replay as speech"}
                          aria-label={speaking ? "Stop speaking" : "Replay as speech"}
                          className={
                            "ml-1 flex h-[18px] items-center gap-1 rounded px-1 transition-colors duration-150 ease-out " +
                            (speaking ? "text-crimson" : "text-ink-muted/60 hover:text-ink-soft")
                          }
                        >
                          {speaking ? <IconStopCircle size={11} /> : <IconPlay size={10} />}
                          {speaking && <span className="text-[10px]">Speaking…</span>}
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}

            {replying && (
              <div className="flex w-full animate-fade-up items-end gap-2.5">
                <ULTRONMark size={24} />
                <div className="rounded-[14px] rounded-bl-[5px] bg-graphite-850/70 px-4 py-3 ultron-elevate">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-ink-muted">
                      ULTRON is thinking
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
      <div className="ultron-glass shrink-0 border-t border-graphite-700/60 px-4 pb-4 pt-3">
        {listening && (
          <div className="mx-auto mb-2.5 flex w-full max-w-[46rem] items-center gap-2.5 rounded-[10px] border border-crimson/25 bg-crimson-soft/40 px-3.5 py-2">
            <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
              <span className="eq-bar w-[3px] rounded-full bg-crimson" />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.15s" }} />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.3s" }} />
              <span className="eq-bar w-[3px] rounded-full bg-crimson" style={{ animationDelay: "0.45s" }} />
            </span>
            <span className="text-[12px] text-ink-soft">
              {mode === "voice"
                ? "Listening — I'll send each sentence as you finish speaking."
                : "Listening — speak, then edit or send when ready."}
            </span>
          </div>
        )}
        {mode !== "text" && !sttSupported && (
          <div className="mx-auto mb-2.5 flex w-full max-w-[46rem] items-center gap-2 rounded-[10px] border border-graphite-700 bg-graphite-850/60 px-3.5 py-2 text-[11.5px] text-ink-muted">
            <IconWaveform size={13} />
            Speech recognition isn't available in this browser — typing still works.
          </div>
        )}

        <div
          className={
            "mx-auto w-full max-w-[46rem] rounded-[14px] border bg-graphite-850 px-2 py-1.5 transition-colors duration-150 ease-out " +
            (listening
              ? "border-crimson/45"
              : "border-graphite-700 focus-within:border-graphite-500")
          }
        >
          {pendingFile && (
            <div className="mb-1 flex items-center gap-1.5 rounded-[9px] bg-graphite-700/60 px-2.5 py-1.5 text-[11.5px] text-ink-soft">
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-ink-muted transition-colors duration-150 ease-out hover:bg-graphite-700 hover:text-ink"
            >
              <IconPaperclip size={15.5} />
            </button>
            <textarea
              ref={composerRef}
              value={text}
              rows={1}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={mode === "voice" ? "Type, or press the mic to speak…" : "Message ULTRON…"}
              aria-label="Message ULTRON"
              className="ultron-scroll max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/55"
            />
            {mode !== "text" && (
              <button
                type="button"
                onClick={onToggleListening}
                disabled={!micAvailable}
                title={
                  !sttSupported
                    ? "Speech recognition isn't supported here"
                    : !voiceSettings.micEnabled
                      ? "Microphone is turned off in Settings"
                      : listening
                        ? "Stop listening"
                        : "Start speaking"
                }
                aria-label={listening ? "Stop listening" : "Start speaking"}
                aria-pressed={listening}
                className={
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 " +
                  (listening ? "bg-crimson-soft text-crimson" : "text-ink-muted hover:bg-graphite-700 hover:text-ink")
                }
              >
                {listening && (
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-crimson/50" />
                )}
                <IconMic size={15.5} className="relative" />
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title="Send"
              aria-label="Send message"
              className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-crimson text-white transition-all duration-150 ease-out hover:bg-crimson-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-graphite-700 disabled:text-ink-muted/40"
            >
              <IconSend size={13.5} />
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2.5 flex w-full max-w-[46rem] items-center justify-center gap-1.5 text-center text-[10.5px] text-ink-muted/55">
          <IconType size={11} className="opacity-70" />
          Enter to send · Shift+Enter for a new line · {shortcutLabel} to focus the composer
        </p>
      </div>
    </main>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-3.5">
        <ULTRONMark size={46} />
        <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
          How can I help you today?
        </h2>
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
            className="rounded-[9px] border border-graphite-700 bg-graphite-850/60 px-3.5 py-1.5 text-[12.5px] text-ink-soft transition-colors duration-150 ease-out hover:border-graphite-500 hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
