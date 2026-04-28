"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Play } from "lucide-react";
import type { ItemView } from "@/lib/api";
import { MCQItem } from "./MCQItem";

type Props = {
  item: ItemView;
  choice: string | null;
  onChange: (id: string) => void;
  disabled: boolean;
};

/**
 * Listening item: forces single-play. The student clicks "Play audio", listens,
 * then answers an MCQ. Once played, the play button is disabled and replaced by
 * a "Audio finished" badge. We disable the native seek bar.
 */
export function ListeningItem({ item, choice, onChange, disabled }: Props) {
  const audioUrl = resolveAudioUrl(item.payload.audio_url);
  const transcript = item.payload.transcript ?? item.payload.passage ?? item.payload.prompt ?? "";
  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const phaseRef = useRef(phase);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Reset on item change (next listening question gets a fresh play state)
  useEffect(() => {
    setPhase("ready");
    setAudioUnavailable(false);
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [item.id]);

  function play() {
    if (audioUrl && !audioUnavailable && typeof window !== "undefined") {
      audioRef.current?.pause();
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.volume = 1;
      audio.onended = () => {
        setPhase("finished");
        phaseRef.current = "finished";
        audioRef.current = null;
      };
      audio.onerror = () => {
        setAudioUnavailable(true);
        audioRef.current = null;
        playSpeechFallback();
      };
      audioRef.current = audio;
      setPhase("playing");
      phaseRef.current = "playing";
      audio.play().catch(() => {
        setAudioUnavailable(true);
        audioRef.current = null;
        playSpeechFallback();
      });
      return;
    }
    playSpeechFallback();
  }

  function playSpeechFallback() {
    if (!transcript || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPhase("finished");
      phaseRef.current = "finished";
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    
    utteranceRef.current = utterance;

    utterance.onend = () => {
      setPhase("finished");
      phaseRef.current = "finished";
      utteranceRef.current = null;
    };
    
    utterance.onerror = (e: any) => {
      console.error("SpeechSynthesis error:", e.error || e);
      setPhase("finished");
      phaseRef.current = "finished";
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
    setPhase("playing");
    phaseRef.current = "playing";
  }

  const hasPlayablePrompt = Boolean(audioUrl || transcript);

  return (
    <div className="mt-8 space-y-6">
      {/* Audio panel */}
      <article className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm dark:bg-black/20">
        <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
          <Headphones className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            Listening · single play
          </span>
        </div>
        <div className="mt-6 flex items-center gap-4">
          {phase === "ready" && (
            <button
              type="button"
              onClick={play}
              disabled={!hasPlayablePrompt}
              className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              Play audio
            </button>
          )}
          {phase === "playing" && (
            <span className="rounded-full bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              Playing… (cannot seek or replay)
            </span>
          )}
          {phase === "finished" && (
            <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Audio finished
            </span>
          )}
        </div>
      </article>

      {/* MCQ — disabled until audio has been played at least once */}
      <MCQItem
        item={item}
        choice={choice}
        onChange={onChange}
        disabled={disabled || (hasPlayablePrompt && phase !== "finished")}
      />
      {phase === "ready" && (
        <p className="text-sm text-[var(--color-muted-fg)]">
          {hasPlayablePrompt
            ? "Audio bir martagina ijro etiladi. Tinglashni boshlash uchun Play tugmasini bosing."
            : "Bu savolda audio topilmadi, javob berishni davom ettirishingiz mumkin."}
        </p>
      )}
    </div>
  );
}

function resolveAudioUrl(audioUrl: string | undefined): string | undefined {
  if (!audioUrl) return undefined;

  const demoAudioMap: Record<string, string> = {
    "https://demo.aiexam.uz/audio/listening/library_dialog.mp3": "/audio/listening/library_dialog.m4a",
    "https://demo.aiexam.uz/audio/listening/lecture_climate.mp3": "/audio/listening/lecture_climate.m4a",
  };
  if (demoAudioMap[audioUrl]) return demoAudioMap[audioUrl];

  try {
    const parsed = new URL(audioUrl);
    if (parsed.hostname === "demo.aiexam.uz") return undefined;
  } catch {
    return audioUrl;
  }

  return audioUrl;
}
