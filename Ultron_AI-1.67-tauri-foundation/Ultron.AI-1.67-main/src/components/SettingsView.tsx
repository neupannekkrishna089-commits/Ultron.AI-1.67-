import type { Settings } from "~/lib/ultron";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  shortcutParts,
  shortcutsEqual,
} from "~/lib/ultron";
import { DEFAULT_SHORTCUT } from "~/lib/ultron";
import type { ShortcutStatus } from "~/App";
import { IconCheck, IconKeyboard, ULTRONMark } from "~/components/icons";

type SettingsViewProps = {
  settings: Settings;
  recording: boolean;
  recordError: string | null;
  justSaved: boolean;
  desktop: boolean;
  shortcutStatus: ShortcutStatus | null;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onResetShortcut: () => void;
};

export function SettingsView({
  settings,
  recording,
  recordError,
  justSaved,
  desktop,
  shortcutStatus,
  onStartRecording,
  onCancelRecording,
  onResetShortcut,
}: SettingsViewProps) {
  const current = settings.activationShortcut;
  const isDefault = shortcutsEqual(current, DEFAULT_SHORTCUT);

  return (
    <main className="ultron-canvas ultron-scroll h-full min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <header className="mb-7">
          <h1 className="text-[19px] font-medium tracking-[-0.01em] text-ink">Settings</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            Tune ULTRON to your liking — changes apply instantly and are stored on this device.
          </p>
        </header>

        {/* Activation shortcut */}
        <section className="ultron-elevate mb-5 rounded-[14px] border border-graphite-700/70 bg-graphite-900">
          <div className="flex items-start gap-3 border-b border-graphite-700/60 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-graphite-800 text-crimson ring-1 ring-inset ring-graphite-700">
              <IconKeyboard size={15} />
            </span>
            <div>
              <h2 className="text-[13px] font-medium text-ink">Activation shortcut</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                Press this combination anywhere in ULTRON (while not typing) to jump to the
                composer. It won't fire inside text fields.
              </p>
            </div>
          </div>

          <div className="px-5 py-4.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12px] text-ink-muted">Current:</span>
              <span className="flex items-center gap-1">
                {shortcutParts(current).map((p, i) => (
                  <kbd
                    key={p + i}
                    className="rounded-md border border-graphite-600 bg-graphite-800 px-2 py-1 text-[11.5px] font-semibold text-ink shadow-[0_1px_0_rgba(0,0,0,0.4)]"
                  >
                    {p}
                  </kbd>
                ))}
              </span>

              <span className="flex items-center gap-2">
                {justSaved && (
                  <span className="flex animate-fade-up items-center gap-1 text-[11.5px] font-medium text-crimson">
                    <IconCheck size={12} /> Applied
                  </span>
                )}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {!isDefault && (
                  <button
                    type="button"
                    onClick={onResetShortcut}
                    className="rounded-[9px] border border-graphite-700 px-3 py-1.5 text-[12px] text-ink-muted transition-colors duration-150 ease-out hover:border-graphite-600 hover:text-ink"
                  >
                    Reset to default
                  </button>
                )}
                {recording ? (
                  <button
                    type="button"
                    onClick={onCancelRecording}
                    className="rounded-[9px] border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-[12px] text-ink transition-colors duration-150 ease-out hover:bg-graphite-700"
                  >
                    Cancel (Esc)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartRecording}
                    className="rounded-[9px] bg-crimson px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all duration-150 ease-out hover:bg-crimson-hover active:scale-[0.97]"
                  >
                    Record new shortcut
                  </button>
                )}
              </div>
            </div>

            {recording ? (
              <div
                className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-crimson/30 bg-crimson-soft/40 px-3.5 py-2.5"
                role="status"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crimson/50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-crimson" />
                </span>
                <span className="text-[12.5px] text-ink">
                  Listening for keys — press the new combination…
                </span>
                <span className="ml-auto text-[11px] text-ink-muted">Esc to cancel</span>
              </div>
            ) : (
              <p className="mt-3.5 text-[11px] leading-relaxed text-ink-muted/80">
                The shortcut must include Ctrl, Alt or Win — single keys are rejected because they
                conflict with typing. This works while ULTRON is focused and you're not in a text
                field.
              </p>
            )}

            {recordError && (
              <p
                className="mt-3 flex animate-fade-up items-center gap-1.5 rounded-[10px] border border-crimson/30 bg-crimson-soft/40 px-3.5 py-2 text-[12px] text-crimson"
                role="alert"
              >
                {recordError}
              </p>
            )}

            {/* OS-level global shortcut status — desktop only. The in-app
                shortcut above always works while ULTRON is focused; this
                reports whether the same combo was also registered with
                Windows as a true global hotkey. */}
            {desktop ? (
              shortcutStatus && (
                <div
                  className={
                    "mt-3 rounded-[10px] border px-3.5 py-2.5 text-[11.5px] leading-relaxed " +
                    (shortcutStatus.registered
                      ? "border-graphite-700 bg-graphite-800/60 text-ink-muted"
                      : "border-crimson/30 bg-crimson-soft/30 text-crimson")
                  }
                >
                  {shortcutStatus.registered ? (
                    <>
                      <span className="text-ink-soft">{shortcutStatus.requested}</span> is
                      registered as a system-wide hotkey — it works even when ULTRON isn't
                      focused.
                    </>
                  ) : (
                    <>
                      Windows wouldn't register{" "}
                      <span className="font-medium">{shortcutStatus.requested}</span> as a global
                      hotkey{shortcutStatus.error ? ` (${shortcutStatus.error})` : ""} — it's
                      likely already reserved by the system. The shortcut above still works while
                      ULTRON's window is focused; pick a different combination above to try
                      registering a free one globally.
                    </>
                  )}
                </div>
              )
            ) : (
              <p className="mt-3 rounded-[10px] border border-graphite-700 bg-graphite-800/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-muted">
                Running in browser-preview mode — system-wide hotkeys are only available in the
                installed desktop app.
              </p>
            )}
          </div>
        </section>

        {/* About */}
        <section className="ultron-elevate rounded-[14px] border border-graphite-700/70 bg-graphite-900">
          <div className="flex items-center gap-4 px-5 py-5">
            <ULTRONMark size={42} />
            <div>
              <h2 className="text-[14px] font-semibold tracking-[0.1em] text-ink">
                {APP_NAME}
                <span className="ml-2 text-[11px] font-normal tracking-normal text-ink-muted">
                  Version {APP_VERSION}
                </span>
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-muted">{APP_TAGLINE}</p>
            </div>
          </div>
          <div className="border-t border-graphite-700/60 px-5 py-4">
            <p className="text-[12px] leading-relaxed text-ink-muted">
              This is a <span className="text-ink-soft">UI preview — AI is coming soon</span>. The
              interface, conversations, attachments and your shortcut preference are stored{" "}
              {desktop ? "in a local SQLite database on this device" : "in this browser"}; nothing
              is sent to any server.
            </p>
            <p className="mt-3 text-[11px] text-ink-muted/60">
              © {new Date().getFullYear()} ULTRON · Built for Windows
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
