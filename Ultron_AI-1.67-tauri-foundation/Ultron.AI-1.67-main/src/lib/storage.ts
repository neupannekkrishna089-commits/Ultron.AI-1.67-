// Storage abstraction for ULTRON.
//
// The rest of the app (src/lib/ultron.ts) only calls getItem/setItem here —
// it never touches localStorage or SQLite directly. That boundary is what
// lets the backend change without touching conversation/settings logic:
//
//  - Running inside the Tauri desktop shell: backed by a local SQLite
//    database (via @tauri-apps/plugin-sql) — the real, long-term store.
//  - Running in a plain browser (e.g. `vite dev` for fast UI iteration
//    outside Tauri): falls back to localStorage so the UI still works.
//
// This is intentionally a simple key/value table for now (see the `kv_store`
// migration in src-tauri/src/lib.rs) — a normalized schema (conversations,
// messages, memory, vault entries, etc.) is a later phase, once those
// systems actually exist. Don't over-engineer this yet.

let tauriSqlPromise: Promise<TauriKvStore | null> | null = null;

type TauriDatabase = {
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T[]>;
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>;
};

class TauriKvStore {
  constructor(private db: TauriDatabase) {}

  async get(key: string): Promise<string | null> {
    const rows = await this.db.select<{ value: string }>(
      "SELECT value FROM kv_store WHERE key = $1",
      [key],
    );
    return rows.length > 0 ? rows[0].value : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.execute(
      "INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [key, value, Date.now()],
    );
  }
}

/** True when running inside the Tauri desktop shell (vs. a plain browser tab). */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function getTauriStore(): Promise<TauriKvStore | null> {
  if (!isDesktop()) return null;
  if (!tauriSqlPromise) {
    tauriSqlPromise = (async () => {
      try {
        const { default: Database } = await import("@tauri-apps/plugin-sql");
        const db = await Database.load("sqlite:ultron.db");
        return new TauriKvStore(db as unknown as TauriDatabase);
      } catch (err) {
        console.error("[ultron/storage] failed to open SQLite database, falling back to localStorage", err);
        return null;
      }
    })();
  }
  return tauriSqlPromise;
}

export async function getItem(key: string): Promise<string | null> {
  const store = await getTauriStore();
  if (store) {
    try {
      return await store.get(key);
    } catch (err) {
      console.error(`[ultron/storage] SQLite read failed for "${key}"`, err);
      return null;
    }
  }
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  const store = await getTauriStore();
  if (store) {
    try {
      await store.set(key, value);
      return;
    } catch (err) {
      console.error(`[ultron/storage] SQLite write failed for "${key}"`, err);
      return;
    }
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage full / private mode — the app still works for this session
  }
}
