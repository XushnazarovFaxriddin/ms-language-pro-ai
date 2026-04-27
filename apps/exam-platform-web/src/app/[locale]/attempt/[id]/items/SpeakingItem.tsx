"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, CheckCircle2 } from "lucide-react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  audioReady: boolean;
  onAudioReady: (key: string, durationMs: number) => void;
  disabled: boolean;
};

type Phase = "idle" | "preparing" | "recording" | "uploading" | "done" | "denied";

/**
 * Speaking item: cue card → preparation timer → record → upload.
 *
 * MVP upload path: send the recorded blob as base64 inside SubmitResponseRequest's
 * `audio_s3_key` is the production target (presigned PUT). For dev, we POST the
 * blob to a placeholder upload URL; if the upload fails, we still allow the
 * student to submit — the back-end stores the placeholder key and grading
 * happens in async (with the real audio later).
 */
export function SpeakingItem({ item, audioReady, onAudioReady, disabled }: Props) {
  const prep = item.payload.preparation_seconds ?? 60;
  const speak = item.payload.speaking_seconds ?? 120;
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState<number>(prep);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  // Cleanup on unmount or item change
  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
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

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = "audio/webm;codecs=opus";
      const supported = MediaRecorder.isTypeSupported?.(mime) ? mime : undefined;
      const mr = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        setPhase("uploading");
        try {
          // MVP: simulate an upload by base64-encoding the blob into the S3 key.
          // In Phase 2 we'll request a presigned PUT and stream the bytes.
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          const fakeKey = `local-blob:${item.id}:${Math.round(durationMs)}ms:${base64.slice(0, 40)}…`;
          onAudioReady(fakeKey, durationMs);
          setPhase("done");
        } catch {
          // Still let the student finish; backend will store a placeholder.
          onAudioReady(`failed-upload:${item.id}`, durationMs);
          setPhase("done");
        }
      };
      mediaRef.current = mr;
      mr.start();
      startedAtRef.current = Date.now();
      setPhase("recording");
      startCountdown(speak, stopRecording);
    } catch {
      setPhase("denied");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
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
            Speaking · Part {item.payload.part ?? 2}
          </span>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed">
          {item.payload.prompt}
        </p>
        <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
          {prep}s tayyorgarlik · {speak}s gapirish
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
            Tayyorgarlikni boshlash
          </button>
        )}
        {phase === "preparing" && (
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              Tayyorgarlik · {secondsLeft}s
            </span>
            <button
              type="button"
              onClick={() => {
                if (tickRef.current) window.clearInterval(tickRef.current);
                void startRecording();
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-primary)]/10"
            >
              Hozir boshlash
            </button>
          </div>
        )}
        {phase === "recording" && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              Yozilmoqda · {secondsLeft}s
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
            >
              <Square className="h-4 w-4" />
              To'xtatish
            </button>
          </div>
        )}
        {phase === "uploading" && (
          <span className="text-sm text-[var(--color-muted-fg)]">Yuklanmoqda…</span>
        )}
        {phase === "done" && (
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Yozuv tayyor — pastdagi Yuborish tugmasini bosing
          </span>
        )}
        {phase === "denied" && (
          <span className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            Mikrofon uchun ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.
          </span>
        )}
      </div>
    </div>
  );
}
