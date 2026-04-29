"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, Square, CheckCircle2 } from "lucide-react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  audioReady: boolean;
  onAudioReady: (audioBase64: string, durationMs: number, format: string) => void;
  disabled: boolean;
};

type Phase = "idle" | "preparing" | "recording" | "processing" | "done" | "denied" | "error";

/**
 * Speaking item: cue card → preparation timer → record → upload.
 *
 * Capture path: send a mono PCM WAV as base64 in SubmitResponseRequest.
 * Gemini audio scoring accepts wav/mp3, so we avoid browser-default webm here.
 * The backend validates and stores the audio payload; a later S3 presigned PUT
 * path can replace this without changing the item-level UI contract.
 */
export function SpeakingItem({ item, audioReady, onAudioReady, disabled }: Props) {
  const t = useTranslations("Exam.speaking");
  const prep = item.payload.preparation_seconds ?? 60;
  const speak = item.payload.speaking_seconds ?? 120;
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState<number>(prep);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const startedAtRef = useRef<number>(0);
  const recordingRef = useRef<boolean>(false);
  const tickRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount or item change
  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      cleanupAudioGraph();
    };
  }, [item.id]);

  function startCountdown(seconds: number, onZero: () => void) {
    setSecondsLeft(seconds);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          onZero();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function cleanupAudioGraph() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close().catch(() => undefined);

    processorRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  }

  async function startRecording() {
    try {
      setError(null);
      const AudioContextCtor = getAudioContextCtor();
      if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
        setError(t("unsupported"));
        setPhase("error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const gain = audioContext.createGain();
      gain.gain.value = 0;

      samplesRef.current = [];
      sampleRateRef.current = audioContext.sampleRate;
      processor.onaudioprocess = (event) => {
        if (!recordingRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      gainRef.current = gain;
      recordingRef.current = true;
      startedAtRef.current = Date.now();
      setPhase("recording");
      startCountdown(speak, () => void stopRecording());
    } catch {
      setPhase("denied");
    }
  }

  async function stopRecording() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (!recordingRef.current) {
      return;
    }
    recordingRef.current = false;
    const durationMs = Date.now() - startedAtRef.current;
    const chunks = samplesRef.current;
    const sampleRate = sampleRateRef.current;
    cleanupAudioGraph();
    setPhase("processing");
    try {
      const blob = encodeWav(chunks, sampleRate);
      if (blob.size === 0) {
        throw new Error("empty recording");
      }
      if (blob.size > 15 * 1024 * 1024) {
        throw new Error("recording is too large");
      }
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const [, encoded] = dataUrl.split(",", 2);
      const base64 = encoded ?? dataUrl;
      onAudioReady(base64, durationMs, "wav");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setPhase("error");
    }
  }

  function startPrep() {
    setPhase("preparing");
    startCountdown(prep, () => {
      // Auto-start recording when prep ends
      void startRecording();
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <article className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm dark:bg-black/20">
        <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
          <Mic className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            {t("label", { part: item.payload.part ?? 2 })}
          </span>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed">
          {item.payload.prompt}
        </p>
        <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
          {t("timing", { prep, speak })}
        </p>
      </article>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 dark:bg-black/20">
        {phase === "idle" && (
          <button
            type="button"
            onClick={startPrep}
            disabled={disabled || audioReady}
            className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 disabled:opacity-40"
          >
            {t("startPrep")}
          </button>
        )}
        {phase === "preparing" && (
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              {t("preparing", { seconds: secondsLeft })}
            </span>
            <button
              type="button"
              onClick={() => {
                if (tickRef.current) window.clearInterval(tickRef.current);
                void startRecording();
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-primary)]/10"
            >
              {t("startNow")}
            </button>
          </div>
        )}
        {phase === "recording" && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {t("recording", { seconds: secondsLeft })}
            </span>
            <button
              type="button"
              onClick={() => void stopRecording()}
              className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
            >
              <Square className="h-4 w-4" />
              {t("stop")}
            </button>
          </div>
        )}
        {phase === "processing" && (
          <span className="text-sm text-[var(--color-muted-fg)]">{t("processing")}</span>
        )}
        {phase === "done" && (
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {t("ready")}
          </span>
        )}
        {phase === "denied" && (
          <span className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            {t("denied")}
          </span>
        )}
        {phase === "error" && (
          <div className="space-y-3">
            <span className="block rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error ?? t("errorGeneric")}
            </span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("idle");
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-primary)]/10"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextCtor(): AudioContextConstructor | undefined {
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  );
}

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
