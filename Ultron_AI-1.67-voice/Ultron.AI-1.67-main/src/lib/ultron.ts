// ULTRON core library: types, localStorage persistence, formatting helpers,
// shortcut matching, and the local mock reply. Everything here is client-side —
// no AI, no network.

export type Shortcut = {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string; // normalized: " " for space, lowercase for letters, else raw e.key
};

export type InteractionMode = "text" | "voice" | "mixed";

export type VoiceSettings = {
  mode: InteractionMode;
  micEnabled: boolean; // master mic switch — off means voice input is unavailable app-wide
  speechOutputEnabled: boolean; // master TTS switch — off means ULTRON never speaks
  voiceId: string | null; // engine-specific voice id; null = system default
  rate: number; // speaking speed, 0.5 – 2
  volume: number; // 0 – 1
};

export type Settings = {
  activationShortcut: Shortcut;
  voice: VoiceSettings;
};

export type Attachment = {
  name: string;
  size: number;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachment?: Attachment;
  via?: "voice" | "text"; // how a user message was entered — cosmetic only
  at: number; // epoch ms
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export const APP_VERSION = "0.1.0";
export const APP_NAME = "ULTRON";
export const APP_TAGLINE = "Personal AI for Windows";

const CONVERSATIONS_KEY = "ultron.conversations.v1";
const ACTIVE_KEY = "ultron.activeConversation.v1";
const SETTINGS_KEY = "ultron.settings.v1";

export const DEFAULT_SHORTCUT: Shortcut = {
  ctrl: true,
  alt: false,
  shift: false,
  meta: false,
  key: " ",
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  mode: "text",
  micEnabled: true,
  speechOutputEnabled: true,
  voiceId: null,
  rate: 1,
  volume: 1,
};

export const DEFAULT_SETTINGS: Settings = {
  activationShortcut: DEFAULT_SHORTCUT,
  voice: DEFAULT_VOICE_SETTINGS,
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — the app still works for this session
  }
}

export function loadConversations(): Conversation[] | null {
  return loadJSON<Conversation[]>(CONVERSATIONS_KEY);
}
export function saveConversations(convs: Conversation[]): void {
  saveJSON(CONVERSATIONS_KEY, convs);
}
export function loadActiveId(): string | null {
  return loadJSON<string>(ACTIVE_KEY);
}
export function saveActiveId(id: string): void {
  saveJSON(ACTIVE_KEY, id);
}
export function loadSettings(): Settings | null {
  const s = loadJSON<Partial<Settings>>(SETTINGS_KEY);
  if (
    !s ||
    !s.activationShortcut ||
    typeof s.activationShortcut.key !== "string" ||
    typeof s.activationShortcut.ctrl !== "boolean"
  ) {
    return null;
  }
  // Merge with defaults so settings saved before voice features shipped
  // (or missing individual voice fields) still hydrate safely.
  return {
    activationShortcut: s.activationShortcut,
    voice: { ...DEFAULT_VOICE_SETTINGS, ...(s.voice ?? {}) },
  };
}
export function saveSettings(s: Settings): void {
  saveJSON(SETTINGS_KEY, s);
}

export function createWelcomeConversation(): Conversation {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: uid(),
        role: "assistant",
        text:
          "Welcome to ULTRON — your personal AI assistant for Windows.\n\nThis is the interface preview: everything here runs locally in your browser and nothing leaves your device. Send a message to try it out — replies are clearly-marked placeholders until the AI engine arrives in a future build.",
        at: now,
      },
    ],
  };
}

// ---- formatting -----------------------------------------------------------

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 36 ? clean.slice(0, 36).trimEnd() + "…" : clean;
}

// ---- shortcuts ------------------------------------------------------------

/** Normalize an e.key value so matching is case/name stable. */
export function normalizeKey(key: string): string {
  if (key === " ") return " ";
  if (key.length === 1) return key.toLowerCase();
  return key; // "ArrowUp", "F5", "Tab", ...
}

export type KeyEventLike = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

export function matchesShortcut(e: KeyEventLike, s: Shortcut): boolean {
  return (
    e.ctrlKey === s.ctrl &&
    e.altKey === s.alt &&
    e.shiftKey === s.shift &&
    e.metaKey === s.meta &&
    normalizeKey(e.key) === s.key
  );
}

export function shortcutParts(s: Shortcut): string[] {
  const parts: string[] = [];
  if (s.ctrl) parts.push("Ctrl");
  if (s.alt) parts.push("Alt");
  if (s.shift) parts.push("Shift");
  if (s.meta) parts.push("Win");
  parts.push(s.key === " " ? "Space" : s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts;
}

export function shortcutToLabel(s: Shortcut): string {
  return shortcutParts(s).join(" + ");
}

export function shortcutsEqual(a: Shortcut, b: Shortcut): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta &&
    normalizeKey(a.key) === normalizeKey(b.key)
  );
}

// ---- mock reply (local placeholder — never fake smarts) -------------------

const MOCK_REPLIES: string[] = [
  "Echoing “{q}” — this is a local placeholder from the ULTRON interface preview. No AI is running yet; this exact exchange is stored on your device and a real reply will come once the engine ships.",
  "“{q}” noted. ULTRON is in UI-preview mode, so here's a canned response stored locally — real understanding is on the roadmap.",
  "Got it: “{q}”. This is a preview build, so my reply is a local mock — the chat shell is fully working, the intelligence is coming soon.",
];

export function mockReply(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const preview = clean.length > 44 ? clean.slice(0, 44).trimEnd() + "…" : clean;
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  return MOCK_REPLIES[hash % MOCK_REPLIES.length].replace("{q}", preview);
}
