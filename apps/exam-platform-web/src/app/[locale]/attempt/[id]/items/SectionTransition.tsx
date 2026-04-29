"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Headphones, BookOpen, PenSquare, Mic, ArrowRight } from "lucide-react";

type Skill = "listening" | "reading" | "writing" | "speaking";

const ICONS: Record<Skill, React.ComponentType<{ className?: string }>> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenSquare,
  speaking: Mic,
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
  const t = useTranslations("Exam");
  const tSkill = useTranslations("Exam.skills");
  const tDesc = useTranslations("Exam.skillDesc");
  const tTransition = useTranslations("Exam.transition");
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
        {t("section", { current: sectionIndex + 1, total: totalSections })}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{tSkill(toSkill)}</h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--color-muted-fg)]">
        {tDesc(toSkill)}
      </p>
      {fromSkill && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          ✓ {tTransition("previousDone", { skill: tSkill(fromSkill) })}
        </p>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 hover:shadow-md"
      >
        {tTransition("continue")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
