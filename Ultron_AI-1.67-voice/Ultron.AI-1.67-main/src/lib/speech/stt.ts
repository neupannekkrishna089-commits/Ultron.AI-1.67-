// Speech-to-text engine backed by the browser's Web Speech API
// (SpeechRecognition / webkitSpeechRecognition). This is the ONLY file that
// talks to that API — swap this module for a server-based STT engine later
// and nothing outside src/lib/speech needs to change, since callers only
// depend on the STTEngine contract in types.ts.

import type { STTEngine, STTHandlers } from "~/lib/speech/types";

// The Web Speech API has no official TS lib entry; declare the minimal
// shape this module actually uses.
type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

function getRecognitionCtor(): WebSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

class WebSpeechSTTEngine implements STTEngine {
  private recognition: WebSpeechRecognition | null = null;
  private active = false;

  get isSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  start(handlers: STTHandlers): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlers.onError?.("Speech recognition isn't supported in this browser.");
      return;
    }
    // Stop any prior session before starting a new one.
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    recognition.onstart = () => {
      this.active = true;
      handlers.onStart?.();
    };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) handlers.onResult({ text: finalText.trim(), isFinal: true });
      else if (interimText) handlers.onResult({ text: interimText, isFinal: false });
    };
    recognition.onerror = (event: any) => {
      const code = event?.error ?? "unknown";
      if (code === "no-speech" || code === "aborted") return; // benign
      const messages: Record<string, string> = {
        "not-allowed": "Microphone access was denied.",
        "audio-capture": "No microphone was found.",
        network: "A network error interrupted speech recognition.",
      };
      handlers.onError?.(messages[code] ?? `Speech recognition error: ${code}`);
    };
    recognition.onend = () => {
      this.active = false;
      handlers.onEnd?.();
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if called while already started — ignore, onend will fire.
    }
  }

  stop(): void {
    if (this.recognition && this.active) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }

  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.active = false;
  }
}

/** Factory — callers get a fresh engine instance bound to the current browser. */
export function createSTTEngine(): STTEngine {
  return new WebSpeechSTTEngine();
}
