// Text-to-speech engine backed by the browser's Web Speech API
// (speechSynthesis / SpeechSynthesisUtterance). This is the ONLY file that
// talks to that API — swap this module for a cloud TTS engine later and
// nothing outside src/lib/speech needs to change, since callers only depend
// on the TTSEngine contract in types.ts.

import type { TTSEngine, TTSSpeakOptions, VoiceOption } from "~/lib/speech/types";

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

class WebSpeechTTSEngine implements TTSEngine {
  private voicesCache: SpeechSynthesisVoice[] | null = null;

  get isSupported(): boolean {
    return synth() !== null;
  }

  private loadVoices(): Promise<SpeechSynthesisVoice[]> {
    const s = synth();
    if (!s) return Promise.resolve([]);
    const existing = s.getVoices();
    if (existing.length > 0) return Promise.resolve(existing);
    // Chromium loads voices asynchronously — wait for the event once.
    return new Promise((resolve) => {
      const handle = () => {
        s.removeEventListener("voiceschanged", handle);
        resolve(s.getVoices());
      };
      s.addEventListener("voiceschanged", handle);
      // Safety timeout in case the event never fires.
      window.setTimeout(() => resolve(s.getVoices()), 1200);
    });
  }

  async listVoices(): Promise<VoiceOption[]> {
    const voices = await this.loadVoices();
    this.voicesCache = voices;
    return voices.map((v) => ({
      id: v.voiceURI,
      label: `${v.name} (${v.lang})`,
      lang: v.lang,
    }));
  }

  speak(text: string, options: TTSSpeakOptions = {}): void {
    const s = synth();
    if (!s) {
      options.onError?.("Speech synthesis isn't supported in this browser.");
      return;
    }
    s.cancel(); // one utterance at a time — new speech interrupts prior speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = clamp(options.rate ?? 1, 0.5, 2);
    utterance.volume = clamp(options.volume ?? 1, 0, 1);

    if (options.voiceId) {
      const voice = (this.voicesCache ?? s.getVoices()).find((v) => v.voiceURI === options.voiceId);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = (e) => {
      // "interrupted"/"canceled" happen whenever speech is intentionally
      // replaced or stopped — not a real failure, so don't surface it.
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err === "interrupted" || err === "canceled") {
        options.onEnd?.();
        return;
      }
      options.onError?.(`Speech playback error: ${err}`);
    };

    s.speak(utterance);
  }

  stop(): void {
    const s = synth();
    s?.cancel();
  }

  isSpeaking(): boolean {
    const s = synth();
    return s ? s.speaking : false;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Factory — callers get a fresh engine instance bound to the current browser. */
export function createTTSEngine(): TTSEngine {
  return new WebSpeechTTSEngine();
}
