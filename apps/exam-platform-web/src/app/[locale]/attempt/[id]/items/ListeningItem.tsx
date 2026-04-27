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
  const audioUrl = item.payload.audio_url;
  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTimeRef = useRef(0);

  // Reset on item change (next listening question gets a fresh play state)
  useEffect(() => {
    setPhase("ready");
    lastTimeRef.current = 0;
  }, [item.id]);

  function play() {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => setPhase("ready"));
    setPhase("playing");
  }

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
              disabled={!audioUrl}
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
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="auto"
              onEnded={() => setPhase("finished")}
              onTimeUpdate={() => {
                if (audioRef.current) lastTimeRef.current = audioRef.current.currentTime;
              }}
              onSeeking={() => {
                if (audioRef.current) audioRef.current.currentTime = lastTimeRef.current;
              }}
              className="hidden"
            />
          )}
        </div>
      </article>

      {/* MCQ — disabled until audio has been played at least once */}
      <MCQItem
        item={item}
        choice={choice}
        onChange={onChange}
        disabled={disabled || phase !== "finished"}
      />
      {phase === "ready" && (
        <p className="text-sm text-[var(--color-muted-fg)]">
          Audio bir martagina ijro etiladi. Tinglashni boshlash uchun Play tugmasini bosing.
        </p>
      )}
    </div>
  );
}
