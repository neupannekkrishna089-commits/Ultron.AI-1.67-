import type { ReactNode } from "react";
import type { Settings, VoiceSettings } from "~/lib/ultron";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  DEFAULT_SHORTCUT,
  shortcutParts,
  shortcutsEqual,
} from "~/lib/ultron";
import type { VoiceOption } from "~/lib/speech/types";
import {
  IconCheck,
  IconKeyboard,
  IconMic,
  IconVolume2,
  IconVolumeX,
  IconWaveform,
  ULTRONMark,
} from "~/components/icons";

type SettingsViewProps = {
  settings: Settings;
  voices: VoiceOption[];
  sttSupported: boolean;
  ttsSupported: boolean;
  recording: boolean;
  recordError: string | null;
  justSaved: boolean;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onResetShortcut: () => void;
  onVoiceSettingsChange: (patch: Partial<VoiceSettings>) => void;
};

const MODES: { id: VoiceSettings["mode"]; label: string; blurb: string }[] = [
  { id: "text", label: "Text", blurb: "Type your messages; ULTRON replies with text only." },
  { id: "voice", label: "Voice", blurb: "Speak your messages; ULTRON replies with text and speech." },
  { id: "mixed", label: "Mixed", blurb: "Freely switch between typing and speaking, anytime." },
];

export function SettingsView({
  settings,
  voices,
  sttSupported,
  ttsSupported,
  recording,
  recordError,
  justSaved,
  onStartRecording,
  onCancelRecording,
  onResetShortcut,
  onVoiceSettingsChange,
}: SettingsViewProps) {
  const current = settings.activationShortcut;
  const isDefault = shortcutsEqual(current, DEFAULT_SHORTCUT);
  const v = settings.voice;

  return (
    <main className="ultron-canvas ultron-scroll h-full min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <header className="mb-7">
          <h1 className="text-[19px] font-medium tracking-[-0.01em] text-ink">Settings</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            Tune ULTRON to your liking — changes apply instantly and are stored on this device.
          </p>
        </header>

        {/* Voice interaction */}
        <section className="ultron-elevate mb-5 rounded-[14px] border border-graphite-700/70 bg-graphite-900">
          <div className="flex items-start gap-3 border-b border-graphite-700/60 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-graphite-800 text-crimson ring-1 ring-inset ring-graphite-700">
              <IconWaveform size={15} />
            </span>
            <div>
              <h2 className="text-[13px] font-medium text-ink">Voice interaction</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                Voice is entirely optional — ULTRON works fully by typing in every mode.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-4.5">
            {/* Mode selector */}
            <div>
              <div className="mb-2 text-[11.5px] font-medium text-ink-soft">Interaction mode</div>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onVoiceSettingsChange({ mode: m.id })}
                    aria-pressed={v.mode === m.id}
                    className={
                      "rounded-[10px] border px-3 py-2.5 text-left transition-colors duration-150 ease-out " +
                      (v.mode === m.id
                        ? "border-crimson/40 bg-crimson-soft/30"
                        : "border-graphite-700 hover:border-graphite-600")
                    }
                  >
                    <div
                      className={
                        "text-[12.5px] font-medium " + (v.mode === m.id ? "text-ink" : "text-ink-soft")
                      }
                    >
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{m.blurb}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-graphite-700/60" />

            {/* Microphone toggle */}
            <ToggleRow
              icon={<IconMic size={14} />}
              label="Microphone"
              description={
                sttSupported
                  ? "Allow ULTRON to listen when Voice or Mixed mode is active."
                  : "Speech recognition isn't supported in this browser."
              }
              checked={v.micEnabled}
              disabled={!sttSupported}
              onChange={(checked) => onVoiceSettingsChange({ micEnabled: checked })}
            />

            {/* Speech output toggle */}
            <ToggleRow
              icon={v.speechOutputEnabled ? <IconVolume2 size={14} /> : <IconVolumeX size={14} />}
              label="Speech output"
              description={
                ttsSupported
                  ? "Let ULTRON read its replies aloud in Voice and Mixed mode."
                  : "Speech synthesis isn't supported in this browser."
              }
              checked={v.speechOutputEnabled}
              disabled={!ttsSupported}
              onChange={(checked) => onVoiceSettingsChange({ speechOutputEnabled: checked })}
            />

            <div className="h-px bg-graphite-700/60" />

            {/* Voice selection */}
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-ink-soft" htmlFor="voice-select">
                Voice
              </label>
              <select
                id="voice-select"
                value={v.voiceId ?? ""}
                disabled={!ttsSupported || voices.length === 0}
                onChange={(e) => onVoiceSettingsChange({ voiceId: e.target.value || null })}
                className="w-full appearance-none rounded-[9px] border border-graphite-700 bg-graphite-800 px-3 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-graphite-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">System default</option>
                {voices.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaking speed */}
            <SliderRow
              label="Speaking speed"
              valueLabel={`${v.rate.toFixed(2)}×`}
              min={0.5}
              max={2}
              step={0.05}
              value={v.rate}
              disabled={!ttsSupported}
              onChange={(rate) => onVoiceSettingsChange({ rate })}
            />

            {/* Volume */}
            <SliderRow
              label="Volume"
              valueLabel={`${Math.round(v.volume * 100)}%`}
              min={0}
              max={1}
              step={0.05}
              value={v.volume}
              disabled={!ttsSupported}
              onChange={(volume) => onVoiceSettingsChange({ volume })}
            />

            <p className="text-[11px] leading-relaxed text-ink-muted/80">
              In Voice mode, each finished sentence sends automatically. In Mixed mode, dictated
              text fills the composer so you can edit or send it yourself. Use the stop icon next to
              any reply to interrupt playback, or replay it any time.
            </p>
          </div>
        </section>

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
              interface, conversations, attachments, voice preferences and your shortcut all live in
              your browser's local storage; nothing is sent to any server.
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

function ToggleRow({
  icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-graphite-800 text-ink-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-ink-soft">{label}</div>
        <div className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 " +
          (checked ? "bg-crimson" : "bg-graphite-700")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-150 ease-out " +
            (checked ? "translate-x-[18px]" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-ink-soft">{label}</span>
        <span className="text-[11px] tabular-nums text-ink-muted">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ultron-range w-full disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}
