// Shared contracts for the speech subsystem.
//
// Nothing in src/lib/speech knows about ULTRON's conversation model or the
// AI core — it only converts speech to text and text to speech. That
// boundary is intentional: today it's backed by the browser's Web Speech
// API (stt.ts / tts.ts), but either half can be swapped for a cloud engine
// (e.g. Whisper, ElevenLabs) later without touching ChatView, the
// conversation store, or the AI core — only these two files would change.

/** A voice option surfaced to the user, engine-agnostic. */
export type VoiceOption = {
  id: string; // stable identifier the engine can look up later
  label: string; // display name, e.g. "Microsoft Aria (en-US)"
  lang: string;
};

export type TranscriptResult = {
  text: string;
  isFinal: boolean;
};

export type STTHandlers = {
  onResult: (result: TranscriptResult) => void;
  onStart?: () => void;
  /** Fired when the engine stops listening for any reason (manual stop, silence, error). */
  onEnd?: () => void;
  onError?: (message: string) => void;
};

/** Minimal control surface any speech-to-text engine must provide. */
export interface STTEngine {
  readonly isSupported: boolean;
  start: (handlers: STTHandlers) => void;
  stop: () => void;
  abort: () => void;
}

export type TTSSpeakOptions = {
  voiceId?: string | null;
  rate?: number; // 0.5 – 2
  volume?: number; // 0 – 1
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

/** Minimal control surface any text-to-speech engine must provide. */
export interface TTSEngine {
  readonly isSupported: boolean;
  listVoices: () => Promise<VoiceOption[]>;
  speak: (text: string, options?: TTSSpeakOptions) => void;
  stop: () => void;
  isSpeaking: () => boolean;
}
