import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type {
  Attachment,
  Conversation,
  InteractionMode,
  Message,
  Settings,
  Shortcut,
} from "~/lib/ultron";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUT,
  createWelcomeConversation,
  deriveTitle,
  loadActiveId,
  loadConversations,
  loadSettings,
  matchesShortcut,
  mockReply,
  normalizeKey,
  saveActiveId,
  saveConversations,
  saveSettings,
  shortcutToLabel,
  uid,
} from "~/lib/ultron";
import type { VoiceOption } from "~/lib/speech/types";
import { createSTTEngine } from "~/lib/speech/stt";
import { createTTSEngine } from "~/lib/speech/tts";
import { Sidebar } from "~/components/Sidebar";
import { ChatView } from "~/components/ChatView";
import { SettingsView } from "~/components/SettingsView";
import { IconClose, IconMaximize, IconMinus, ULTRONMark } from "~/components/icons";

export const Route = createFileRoute("/")({
  component: App,
});

type View = "chat" | "settings";

function App() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pendingFile, setPendingFile] = useState<Attachment | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // ---- voice interaction state (speech I/O only — the AI core above never
  // touches this; it just receives the same plain-text `handleSend` either way) ----
  const [composerText, setComposerText] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [sttSupported, setSttSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordingRef = useRef(false);
  const sttEngineRef = useRef<ReturnType<typeof createSTTEngine> | null>(null);
  const ttsEngineRef = useRef<ReturnType<typeof createTTSEngine> | null>(null);
  const listenBaseTextRef = useRef(""); // composer text snapshot when listening began
  const lastSpokenIdRef = useRef<string | null>(null);
  const settingsRef = useRef<Settings | null>(null);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Hydrate from localStorage (client-only — SSR renders the loading shell).
  useEffect(() => {
    const stored = loadConversations();
    if (stored && stored.length > 0) {
      setConversations(stored);
      const savedActive = loadActiveId();
      setActiveId(
        savedActive && stored.some((c) => c.id === savedActive) ? savedActive : stored[0].id,
      );
    } else {
      const seed = [createWelcomeConversation()];
      setConversations(seed);
      setActiveId(seed[0].id);
    }
    setSettings(loadSettings() ?? DEFAULT_SETTINGS);
  }, []);

  // Set up the speech engines once, client-side only. Either engine can be
  // swapped for a different implementation in src/lib/speech without
  // touching anything below this block.
  useEffect(() => {
    const stt = createSTTEngine();
    const tts = createTTSEngine();
    sttEngineRef.current = stt;
    ttsEngineRef.current = tts;
    setSttSupported(stt.isSupported);
    setTtsSupported(tts.isSupported);
    if (tts.isSupported) {
      tts.listVoices().then(setVoices);
    }
    return () => {
      stt.abort();
      tts.stop();
    };
  }, []);

  // Persist to localStorage whenever state changes.
  useEffect(() => {
    if (conversations) saveConversations(conversations);
  }, [conversations]);
  useEffect(() => {
    if (activeId) saveActiveId(activeId);
  }, [activeId]);
  useEffect(() => {
    if (settings) saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const activeConversation = conversations?.find((c) => c.id === activeId) ?? null;

  /** Jump the app to the composer (global activation shortcut). */
  const activate = useCallback(() => {
    setView("chat");
    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (document.activeElement === el) el?.blur();
      else el?.focus();
    });
  }, []);

  // Global activation shortcut — reads the persisted/configured combo.
  useEffect(() => {
    if (!settings) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (recordingRef.current) return;
      const t = e.target as HTMLElement | null;
      const tag = t ? t.tagName : "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (t?.isContentEditable ?? false);
      if (typing) return;
      if (matchesShortcut(e, settings.activationShortcut)) {
        e.preventDefault();
        activate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings, activate]);

  // Shortcut recorder — captures the next key combination while recording.
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        recordingRef.current = false;
        setRecording(false);
        setRecordError(null);
        return;
      }
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return; // wait for a non-modifier
      const next: Shortcut = {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        key: normalizeKey(e.key),
      };
      if (!(next.ctrl || next.alt || next.meta)) {
        setRecordError("A single key conflicts with typing — hold Ctrl, Alt or Win.");
        return;
      }
      setSettings((s) => ({ ...(s ?? DEFAULT_SETTINGS), activationShortcut: next }));
      recordingRef.current = false;
      setRecording(false);
      setRecordError(null);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recording]);

  // ---- conversation actions ----

  const handleNewChat = () => {
    const now = Date.now();
    const c: Conversation = {
      id: uid(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setConversations((cs) => (cs ? [c, ...cs] : [c]));
    setActiveId(c.id);
    setView("chat");
    stopListening();
    ttsEngineRef.current?.stop();
    setSpeakingId(null);
    setPendingFile(null);
    setReplyingId(null);
    setComposerText("");
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setView("chat");
    ttsEngineRef.current?.stop();
    setSpeakingId(null);
  };

  const handleDelete = (id: string) => {
    if (!conversations) return;
    const rest = conversations.filter((c) => c.id !== id);
    if (rest.length === 0) {
      const fresh = createWelcomeConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(rest);
      if (activeId === id) setActiveId(rest[0].id);
    }
  };

  const speakText = useCallback((id: string, text: string) => {
    const tts = ttsEngineRef.current;
    const s = settingsRef.current;
    if (!tts || !tts.isSupported || !s) return;
    setTtsError(null);
    setSpeakingId(id);
    tts.speak(text, {
      voiceId: s.voice.voiceId,
      rate: s.voice.rate,
      volume: s.voice.volume,
      onEnd: () => setSpeakingId((cur) => (cur === id ? null : cur)),
      onError: (msg) => {
        setTtsError(msg);
        setSpeakingId((cur) => (cur === id ? null : cur));
      },
    });
  }, []);

  const handleSend = useCallback(
    (text: string, via: "voice" | "text" = "text") => {
      const conv = activeConversation;
      if (!conv) return;
      const now = Date.now();
      const hasUserMsg = conv.messages.some((m) => m.role === "user");
      const userMsg: Message = {
        id: uid(),
        role: "user",
        text,
        attachment: pendingFile ?? undefined,
        via,
        at: now,
      };
      const nextTitle = hasUserMsg
        ? conv.title
        : text.trim()
          ? deriveTitle(text)
          : pendingFile
            ? "📎 " + deriveTitle(pendingFile.name)
            : conv.title;

      setConversations((cs) =>
        cs
          ? cs.map((c) =>
              c.id === conv.id
                ? {
                    ...c,
                    title: nextTitle,
                    messages: [...c.messages, userMsg],
                    updatedAt: now,
                  }
                : c,
            )
          : cs,
      );
      setPendingFile(null);
      setReplyingId(conv.id);

      // Local placeholder reply — clearly a mock, no AI involved. Voice
      // output (if enabled) is triggered from the effect below once this
      // lands in conversation state, so it works the same regardless of
      // who calls handleSend.
      window.setTimeout(
        () => {
          const reply: Message = {
            id: uid(),
            role: "assistant",
            text: text.trim()
              ? mockReply(text)
              : "Got your attachment — it's stored locally with this conversation. Real file understanding arrives with the AI engine.",
            at: Date.now(),
          };
          setConversations((cs) =>
            cs
              ? cs.map((c) =>
                  c.id === conv.id
                    ? { ...c, messages: [...c.messages, reply], updatedAt: Date.now() }
                    : c,
                )
              : cs,
          );
          setReplyingId((r) => (r === conv.id ? null : r));
        },
        900 + Math.random() * 600,
      );
    },
    [activeConversation, pendingFile],
  );

  // Auto-speak new assistant replies when the current mode calls for it.
  useEffect(() => {
    if (!activeConversation || !settings) return;
    if (settings.voice.mode === "text" || !settings.voice.speechOutputEnabled) return;
    const last = activeConversation.messages[activeConversation.messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;
    speakText(last.id, last.text);
  }, [activeConversation, settings, speakText]);

  const stopListening = useCallback(() => {
    sttEngineRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const stt = sttEngineRef.current;
    const s = settingsRef.current;
    if (!stt || !stt.isSupported || !s?.voice.micEnabled) return;
    setMicError(null);
    listenBaseTextRef.current = composerText;
    stt.start({
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
      onError: (msg) => {
        setMicError(msg);
        setListening(false);
      },
      onResult: (result) => {
        const base = listenBaseTextRef.current;
        const joined = base ? `${base} ${result.text}` : result.text;
        if (result.isFinal) {
          listenBaseTextRef.current = joined;
          setComposerText(joined);
          if (settingsRef.current?.voice.mode === "voice") {
            // Voice Mode: each finished utterance sends immediately so the
            // user never has to touch the keyboard.
            handleSend(joined, "voice");
            listenBaseTextRef.current = "";
            setComposerText("");
          }
        } else {
          setComposerText(joined);
        }
      },
    });
  }, [composerText, handleSend]);

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile({ name: f.name, size: f.size });
    e.target.value = "";
  };

  const handleOpenSettings = () => {
    setView("settings");
    stopListening();
    composerRef.current?.blur();
  };

  const handleModeChange = (mode: InteractionMode) => {
    setSettings((s) => ({ ...(s ?? DEFAULT_SETTINGS), voice: { ...(s ?? DEFAULT_SETTINGS).voice, mode } }));
    if (mode === "text") stopListening();
  };

  // SSR / pre-hydration shell.
  if (!conversations || !settings) {
    return (
      <div className="flex h-dvh items-center justify-center bg-graphite-950">
        <div className="flex animate-fade-in items-center gap-2.5 text-ink-muted">
          <ULTRONMark size={22} />
          <span className="text-[13px]">Loading ULTRON…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-graphite-950 text-ink antialiased">
      {/* Window titlebar (cosmetic — desktop-app chrome) */}
      <div className="flex h-9 shrink-0 select-none items-center justify-between border-b border-graphite-700/60 bg-graphite-900 pl-3">
        <div className="flex items-center gap-2">
          <ULTRONMark size={14} />
          <span className="text-[11px] font-medium tracking-[0.16em] text-ink-muted">
            ULTRON
          </span>
        </div>
        <div className="flex h-full items-center">
          {[IconMinus, IconMaximize, IconClose].map((Icon, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              title={i === 0 ? "Minimize (preview)" : i === 1 ? "Maximize (preview)" : "Close (preview)"}
              className={
                "flex h-full w-11 items-center justify-center text-ink-muted/70 transition-colors duration-150 ease-out " +
                (i === 2 ? "hover:bg-crimson hover:text-white" : "hover:bg-graphite-800 hover:text-ink")
              }
            >
              <Icon size={10.5} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          view={view}
          onNewChat={handleNewChat}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onOpenSettings={handleOpenSettings}
        />

        {view === "chat" && activeConversation ? (
          <ChatView
            conversation={activeConversation}
            voiceSettings={settings.voice}
            text={composerText}
            onTextChange={setComposerText}
            listening={listening}
            micError={micError}
            speakingId={speakingId}
            ttsError={ttsError}
            sttSupported={sttSupported}
            ttsSupported={ttsSupported}
            pendingFile={pendingFile}
            replying={replyingId === activeConversation.id}
            shortcutLabel={shortcutToLabel(settings.activationShortcut)}
            composerRef={composerRef}
            onSend={(t) => handleSend(t, "text")}
            onToggleListening={toggleListening}
            onPickFile={() => fileInputRef.current?.click()}
            onClearFile={() => setPendingFile(null)}
            onModeChange={handleModeChange}
            onReplay={(id, t) => speakText(id, t)}
            onStopSpeaking={() => {
              ttsEngineRef.current?.stop();
              setSpeakingId(null);
            }}
          />
        ) : view === "chat" ? (
          <div className="ultron-canvas flex flex-1 items-center justify-center text-[13px] text-ink-muted">
            Select or create a conversation to start.
          </div>
        ) : (
          <SettingsView
            settings={settings}
            voices={voices}
            sttSupported={sttSupported}
            ttsSupported={ttsSupported}
            recording={recording}
            recordError={recordError}
            justSaved={justSaved}
            onStartRecording={() => {
              recordingRef.current = true;
              setRecording(true);
              setRecordError(null);
            }}
            onCancelRecording={() => {
              recordingRef.current = false;
              setRecording(false);
              setRecordError(null);
            }}
            onResetShortcut={() => {
              setSettings((s) => ({
                ...(s ?? DEFAULT_SETTINGS),
                activationShortcut: DEFAULT_SHORTCUT,
              }));
              setJustSaved(true);
              window.setTimeout(() => setJustSaved(false), 2000);
            }}
            onVoiceSettingsChange={(patch) => {
              setSettings((s) => ({
                ...(s ?? DEFAULT_SETTINGS),
                voice: { ...(s ?? DEFAULT_SETTINGS).voice, ...patch },
              }));
            }}
          />
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
