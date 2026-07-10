"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Mic, Square, CheckCircle2, Play, Pause, Volume2 } from "lucide-react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  audioReady: boolean;
  onAudioReady: (audioBase64: string, durationMs: number, format: string) => void;
  disabled: boolean;
};

type Phase = "idle" | "preparing" | "recording" | "processing" | "done" | "denied" | "error";

/* ─── Part-specific IELTS Speaking instructions ─── */
const PART_INSTRUCTIONS: Record<number, { title: string; desc: string; prep: number; speak: number }> = {
  1: {
    title: "Part 1 — Introduction & Interview",
    desc: "The examiner will ask you general questions about yourself and familiar topics such as home, family, work, studies, and interests.",
    prep: 0,
    speak: 30,
  },
  2: {
    title: "Part 2 — Individual Long Turn",
    desc: "You will be given a cue card with a topic. You have 1 minute to prepare, then speak for 1-2 minutes on the topic.",
    prep: 60,
    speak: 120,
  },
  3: {
    title: "Part 3 — Two-way Discussion",
    desc: "The examiner will ask further questions connected to the topic in Part 2. These questions require more in-depth and analytical responses.",
    prep: 0,
    speak: 60,
  },
};

/**
 * Speaking item with Part 1/2/3 differentiation, audio level indicator,
 * and playback preview before submission.
 *
 * Capture path: send a mono PCM WAV as base64 in SubmitResponseRequest.
 */
export function SpeakingItem({ item, audioReady, onAudioReady, disabled }: Props) {
  const t = useTranslations("Exam.speaking");
  const part = item.payload.part ?? 2;
  const partInfo = PART_INSTRUCTIONS[part] ?? PART_INSTRUCTIONS[2]!;
  const prep = item.payload.preparation_seconds ?? partInfo!.prep;
  const speak = item.payload.speaking_seconds ?? partInfo!.speak;

  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState<number>(prep || speak);
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0-100
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const startedAtRef = useRef<number>(0);
  const recordingRef = useRef<boolean>(false);
  const tickRef = useRef<number | null>(null);
  const levelAnimRef = useRef<number | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount or item change
  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (levelAnimRef.current) cancelAnimationFrame(levelAnimRef.current);
      cleanupAudioGraph();
      playbackRef.current?.pause();
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
    if (levelAnimRef.current) cancelAnimationFrame(levelAnimRef.current);
    levelAnimRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close().catch(() => undefined);
    processorRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    setAudioLevel(0);
  }

  // Audio level metering using AnalyserNode
  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioLevel(Math.min(100, Math.round(rms * 400))); // scale to 0-100
      levelAnimRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, []);

  async function startRecording() {
    try {
      setError(null);
      const AudioContextCtor = getAudioContextCtor();
      if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
        setError(t("unsupported"));
        setPhase("error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      samplesRef.current = [];
      sampleRateRef.current = audioContext.sampleRate;
      processor.onaudioprocess = (event) => {
        if (!recordingRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(input));
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(gain);
      gain.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      gainRef.current = gain;
      analyserRef.current = analyser;
      recordingRef.current = true;
      startedAtRef.current = Date.now();
      setPhase("recording");
      startCountdown(speak, () => void stopRecording());
      startLevelMeter();
    } catch {
      setPhase("denied");
    }
  }

  async function stopRecording() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const durationMs = Date.now() - startedAtRef.current;
    const chunks = samplesRef.current;
    const sampleRate = sampleRateRef.current;
    cleanupAudioGraph();
    setPhase("processing");
    try {
      const blob = encodeWav(chunks, sampleRate);
      if (blob.size === 0) throw new Error("empty recording");
      if (blob.size > 15 * 1024 * 1024) throw new Error("recording is too large");
      setRecordedBlob(blob);

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
    if (prep === 0) {
      // Part 1 & 3: no preparation, go directly to recording
      void startRecording();
      return;
    }
    setPhase("preparing");
    startCountdown(prep, () => {
      void startRecording();
    });
  }

  // Audio playback preview
  function togglePlayback() {
    if (!recordedBlob) return;
    if (isPlaying) {
      playbackRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(url);
    };
    playbackRef.current = audio;
    audio.play();
    setIsPlaying(true);
  }

  // Timer color based on urgency
  const timerColor = secondsLeft <= 10
    ? "text-red-600 dark:text-red-400"
    : secondsLeft <= 30
    ? "text-amber-600 dark:text-amber-400"
    : "text-[var(--color-fg)]";

  return (
    <div className="mt-8 space-y-6">
      {/* Part-specific header */}
      <article className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm dark:bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
            <Mic className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {t("label", { part })}
            </span>
          </div>
          {/* Part badge */}
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            part === 1 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : part === 2 ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
            : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
          }`}>
            Part {part}
          </span>
        </div>

        {/* Part instructions */}
        <div className="mt-4 rounded-xl bg-[var(--color-muted)]/10 px-4 py-3 text-sm">
          <p className="font-semibold">{partInfo!.title}</p>
          <p className="mt-1 text-[var(--color-muted-fg)]">{partInfo!.desc}</p>
        </div>

        {/* Prompt / Cue card */}
        <div className="mt-6">
          {part === 2 ? (
            // Cue card style for Part 2
            <div className="rounded-xl border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3">
                Cue Card
              </p>
              <p className="whitespace-pre-wrap text-lg leading-relaxed font-medium">
                {item.payload.prompt}
              </p>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-lg leading-relaxed">
              {item.payload.prompt}
            </p>
          )}
        </div>

        {prep > 0 && (
          <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
            {t("timing", { prep, speak })}
          </p>
        )}
      </article>

      {/* Recording panel */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 dark:bg-black/20">
        {phase === "idle" && (
          <button
            type="button"
            onClick={startPrep}
            disabled={disabled || audioReady}
            className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 disabled:opacity-40"
          >
            {prep > 0 ? t("startPrep") : t("startNow")}
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
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className={timerColor}>{t("recording", { seconds: secondsLeft })}</span>
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

            {/* Audio Level Meter */}
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-[var(--color-muted-fg)] shrink-0" />
              <div className="flex-1 h-3 rounded-full bg-[var(--color-muted)]/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    audioLevel > 70 ? "bg-red-500" : audioLevel > 40 ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-xs text-[var(--color-muted-fg)] w-8 text-right tabular-nums">
                {audioLevel}%
              </span>
            </div>
            {audioLevel < 5 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Microphone level is very low. Please speak louder or check your microphone.
              </p>
            )}
          </div>
        )}

        {phase === "processing" && (
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <span className="text-sm text-[var(--color-muted-fg)]">{t("processing")}</span>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3">
            <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {t("ready")}
            </span>
            {/* Playback preview */}
            {recordedBlob && (
              <button
                type="button"
                onClick={togglePlayback}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause preview" : "Preview recording"}
              </button>
            )}
          </div>
        )}

        {phase === "denied" && (
          <div className="space-y-3">
            <span className="block rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {t("denied")}
            </span>
            <button
              type="button"
              onClick={() => { setError(null); setPhase("idle"); }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-primary)]/10"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3">
            <span className="block rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error ?? t("errorGeneric")}
            </span>
            <button
              type="button"
              onClick={() => { setError(null); setPhase("idle"); }}
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
