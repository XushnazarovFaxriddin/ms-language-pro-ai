"use client";

import { motion } from "framer-motion";
import { Headphones, BookOpen, PenSquare, Mic, ArrowRight } from "lucide-react";

type Skill = "listening" | "reading" | "writing" | "speaking";

const ICONS: Record<Skill, React.ComponentType<{ className?: string }>> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenSquare,
  speaking: Mic,
};

const TITLES_UZ: Record<Skill, string> = {
  listening: "Tinglash",
  reading: "O'qish",
  writing: "Yozish",
  speaking: "Gapirish",
};

const DESC_UZ: Record<Skill, string> = {
  listening: "Audio bir martagina ijro etiladi. Tayyor bo'lganingizda Play tugmasini bosing.",
  reading: "Matnni diqqat bilan o'qing va savollarga javob bering.",
  writing: "Berilgan mavzuda kamida 250 so'zli insho yozing.",
  speaking: "Cue card asosida gapirib bering. 1 daqiqa tayyorgarlik + 2 daqiqa gapirish.",
};

type Props = {
  fromSkill: Skill | null;
  toSkill: Skill;
  sectionIndex: number;
  totalSections: number;
  onContinue: () => void;
};

export function SectionTransition({
  fromSkill,
  toSkill,
  sectionIndex,
  totalSections,
  onContinue,
}: Props) {
  const Icon = ICONS[toSkill];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto max-w-2xl px-6 py-20 text-center"
    >
      <div className="mx-auto inline-flex items-center justify-center rounded-full bg-[var(--color-primary)]/10 p-5">
        <Icon className="h-10 w-10 text-[var(--color-primary)]" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-fg)]">
        Bo'lim {sectionIndex + 1} / {totalSections}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{TITLES_UZ[toSkill]}</h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--color-muted-fg)]">
        {DESC_UZ[toSkill]}
      </p>
      {fromSkill && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          ✓ {TITLES_UZ[fromSkill]} bo'limi tugadi
        </p>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 hover:shadow-md"
      >
        Boshlash
        <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
