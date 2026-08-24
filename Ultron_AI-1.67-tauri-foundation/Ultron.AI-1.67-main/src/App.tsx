import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Attachment, Conversation, Message, Settings, Shortcut } from "~/lib/ultron";
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
  shortcutParts,
  shortcutToLabel,
  uid,
} from "~/lib/ultron";
import { isDesktop } from "~/lib/storage";
import { Sidebar } from "~/components/Sidebar";
import { ChatView } from "~/components/ChatView";
import { SettingsView } from "~/components/SettingsView";
import { IconClose, IconMaximize, IconMinus, ULTRONMark } from "~/components/icons";

type View = "chat" | "settings";

export type ShortcutStatus = {
  requested: string; // human label of the combo that was attempted
  registered: boolean;
  error: string | null;
};

export function App() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [listening, setListening] = useState(false);
  const [pendingFile, setPendingFile] = useState<Attachment | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutStatus | null>(null);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordingRef = useRef(false);
  const desktop = isDesktop();

  // Hydrate from storage (SQLite on desktop, localStorage in a plain browser
  // preview). Client-only — there's no SSR in this app anymore.
  useEffect(() => {
    (async () => {
      const stored = await loadConversations();
      if (stored && stored.length > 0) {
        setConversations(stored);
        const savedActive = await loadActiveId();
        setActiveId(
          savedActive && stored.some((c) => c.id === savedActive) ? savedActive : stored[0].id,
        );
      } else {
        const seed = [createWelcomeConversation()];
        setConversations(seed);
        setActiveId(seed[0].id);
      }
      setSettings((await loadSettings()) ?? DEFAULT_SETTINGS);
    })();
  }, []);

  // Persist whenever state changes.
  useEffect(() => {
    if (conversations) void saveConversations(conversations);
  }, [conversations]);
  useEffect(() => {
    if (activeId) void saveActiveId(activeId);
  }, [activeId]);
  useEffect(() => {
    if (settings) void saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const activeConversation = conversations?.find((c) => c.id === activeId) ?? null;

  /** Jump the app to the composer — triggered by the in-window shortcut and,
   *  on desktop, by the OS-level global shortcut via the Rust backend. */
  const activate = useCallback(() => {
    setView("chat");
    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (document.activeElement === el) el?.blur();
      else el?.focus();
    });
  }, []);

  // In-window activation shortcut — works while ULTRON's window has focus.
  // This is a convenience layer on top of the real global shortcut below;
  // it keeps working even if the OS-level registration failed.
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

  // Desktop-only: wire up the real OS-level global shortcut, window
  // controls, and the tray. All optional — the app must still work fully as
  // a plain browser preview (isDesktop() === false) for fast UI iteration.
  useEffect(() => {
    if (!desktop) return;
    let unlistenActivate: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");

      unlistenActivate = await listen("ultron://activate-composer", () => activate());
      unlistenStatus = await listen<ShortcutStatus>("ultron://shortcut-status", (e) => {
        setShortcutStatus(e.payload);
      });

      // Ask the backend what happened when it tried to register the
      // configured (default: Win+U) shortcut at startup, in case the event
      // fired before this listener was attached.
      try {
        const status = await invoke<ShortcutStatus>("get_shortcut_status");
        setShortcutStatus(status);
      } catch {
        // command not available yet — status will arrive via the event instead
      }
    })();
    return () => {
      unlistenActivate?.();
      unlistenStatus?.();
    };
  }, [desktop, activate]);

  const applyShortcut = useCallback(
    async (next: Shortcut) => {
      setSettings((s) => ({ ...(s ?? DEFAULT_SETTINGS), activationShortcut: next }));
      if (desktop) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const status = await invoke<ShortcutStatus>("set_global_shortcut", {
            combo: shortcutParts(next).join("+"),
            label: shortcutToLabel(next),
          });
          setShortcutStatus(status);
        } catch (err) {
          setShortcutStatus({
            requested: shortcutToLabel(next),
            registered: false,
            error: String(err),
          });
        }
      }
    },
    [desktop],
  );

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
      void applyShortcut(next);
      recordingRef.current = false;
      setRecording(false);
      setRecordError(null);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recording, applyShortcut]);

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
    setListening(false);
    setPendingFile(null);
    setReplyingId(null);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setView("chat");
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

  const handleSend = (text: string) => {
    if (!activeConversation) return;
    const conv = activeConversation;
    const now = Date.now();
    const hasUserMsg = conv.messages.some((m) => m.role === "user");
    const userMsg: Message = {
      id: uid(),
      role: "user",
      text,
      attachment: pendingFile ?? undefined,
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

    // Local placeholder reply — clearly a mock, no AI involved. This phase
    // is the desktop foundation only; the real AI Core is a later phase.
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
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPendingFile({ name: f.name, size: f.size });
    e.target.value = "";
  };

  const handleOpenSettings = () => {
    setView("settings");
    setListening(false);
    composerRef.current?.blur();
  };

  // ---- window controls (real on desktop, no-op in a plain browser) ----

  const windowAction = async (action: "minimize" | "toggleMaximize" | "close") => {
    if (!desktop) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (action === "minimize") await win.minimize();
    else if (action === "toggleMaximize") await win.toggleMaximize();
    else await win.close();
  };

  // Pre-hydration shell.
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
      {/* Window titlebar — a real, draggable custom titlebar on desktop
          (window decorations are disabled in tauri.conf.json), cosmetic-only
          in a plain browser preview. */}
      <div
        data-tauri-drag-region={desktop ? "" : undefined}
        className="flex h-9 shrink-0 select-none items-center justify-between border-b border-graphite-700/60 bg-graphite-900 pl-3"
      >
        <div data-tauri-drag-region={desktop ? "" : undefined} className="flex items-center gap-2">
          <ULTRONMark size={14} />
          <span className="text-[11px] font-medium tracking-[0.16em] text-ink-muted">
            ULTRON
          </span>
        </div>
        <div className="flex h-full items-center">
          {(
            [
              { Icon: IconMinus, action: "minimize" as const, title: "Minimize" },
              { Icon: IconMaximize, action: "toggleMaximize" as const, title: "Maximize" },
              { Icon: IconClose, action: "close" as const, title: "Close" },
            ]
          ).map(({ Icon, action, title }) => (
            <button
              key={action}
              type="button"
              tabIndex={-1}
              title={desktop ? title : `${title} (preview — desktop only)`}
              onClick={() => windowAction(action)}
              className={
                "flex h-full w-11 items-center justify-center text-ink-muted/70 transition-colors duration-150 ease-out " +
                (action === "close" ? "hover:bg-crimson hover:text-white" : "hover:bg-graphite-800 hover:text-ink")
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
            listening={listening}
            pendingFile={pendingFile}
            replying={replyingId === activeConversation.id}
            shortcutLabel={shortcutToLabel(settings.activationShortcut)}
            composerRef={composerRef}
            onSend={handleSend}
            onToggleListening={() => setListening((l) => !l)}
            onPickFile={() => fileInputRef.current?.click()}
            onClearFile={() => setPendingFile(null)}
          />
        ) : view === "chat" ? (
          <div className="ultron-canvas flex flex-1 items-center justify-center text-[13px] text-ink-muted">
            Select or create a conversation to start.
          </div>
        ) : (
          <SettingsView
            settings={settings}
            recording={recording}
            recordError={recordError}
            justSaved={justSaved}
            desktop={desktop}
            shortcutStatus={shortcutStatus}
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
              void applyShortcut(DEFAULT_SHORTCUT);
              setJustSaved(true);
              window.setTimeout(() => setJustSaved(false), 2000);
            }}
          />
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
