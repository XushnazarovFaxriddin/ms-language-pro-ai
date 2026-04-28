"use client";

import { useState } from "react";
import { api, type AttemptFeedbackOut, type FeedbackArtifactOut } from "@/lib/api";
import { Loader2, MessageCircle, RefreshCw, ChevronDown, ChevronUp, FileText, CheckCircle, AlertTriangle, Lightbulb } from "lucide-react";

export function FeedbackSection({ 
  attemptId, 
  initialFeedback 
}: { 
  attemptId: string, 
  initialFeedback: AttemptFeedbackOut | null 
}) {
  const [feedback, setFeedback] = useState<AttemptFeedbackOut | null>(initialFeedback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openLayer, setOpenLayer] = useState<string | null>("overview");

  const generateFeedback = async () => {
    setLoading(true);
    setError("");
    try {
      await api.feedback.generateOverview(attemptId);
      const refreshed = await api.feedback.getAttemptFeedback(attemptId);
      setFeedback(refreshed);
      setOpenLayer("overview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fikr-mulohaza yaratishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (!feedback || feedback.artifacts.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 sm:p-12 text-center shadow-sm">
        <MessageCircle className="mx-auto h-12 w-12 text-[var(--color-muted-fg)] opacity-50 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Fikr-mulohaza (Feedback)</h2>
        <p className="text-[var(--color-muted-fg)] mb-8 max-w-md mx-auto">
          Ushbu imtihon uchun AI tomonidan to'liq tahlil va fikr-mulohazalar hozircha mavjud emas. Uni hoziroq generatsiya qilishingiz mumkin.
        </p>
        
        {error && (
          <div className="mb-6 mx-auto max-w-md rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button 
          onClick={generateFeedback}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          Tahlilni boshlash
        </button>
      </div>
    );
  }

  // Group artifacts by layer
  const overview = feedback.artifacts.find(a => a.layer === "overview");
  const sentenceArtifacts = feedback.artifacts.filter(a => a.layer === "sentence");
  const wordArtifacts = feedback.artifacts.filter(a => a.layer === "word");
  const phonemeArtifacts = feedback.artifacts.filter(a => a.layer === "phoneme");
  const sentenceItems = flattenSentenceItems(sentenceArtifacts);
  const wordItems = flattenWordItems(wordArtifacts);
  const phonemeItems = flattenPhonemeItems(phonemeArtifacts);

  const toggleLayer = (layer: string) => {
    setOpenLayer(prev => prev === layer ? null : layer);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-[var(--color-primary)]" />
        AI Fikr-mulohaza
      </h2>

      {/* Overview Accordion */}
      {overview && (
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] overflow-hidden">
          <button 
            onClick={() => toggleLayer("overview")}
            className="flex w-full items-center justify-between p-6 bg-[var(--color-muted)]/10 hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            <span className="font-bold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" /> Umumiy Xulosa (Overview)
            </span>
            {openLayer === "overview" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          
          {openLayer === "overview" && (
            <div className="p-6 border-t border-[var(--color-border)]/50">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-base leading-relaxed">{overview.payload.narrative_uz}</p>
                {overview.payload.bands && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-5">
                    {["overall", "listening", "reading", "writing", "speaking"].map((skill) => (
                      <div key={skill} className="rounded-xl border border-[var(--color-border)]/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)]">
                          {skill}
                        </p>
                        <p className="mt-1 text-xl font-black">
                          {formatBand(overview.payload.bands[skill])}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4" /> Asosiy tavsiya
                  </p>
                  <p className="text-sm font-mono text-[var(--color-fg)]">Keyingi qadam: {overview.payload.next_step_ref}</p>
                  <p className="text-sm mt-1">Siz uchun eng katta imkoniyat bu: <span className="font-bold">{overview.payload.biggest_opportunity_code}</span> ni yaxshilash.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sentence Accordion */}
      {sentenceItems.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] overflow-hidden">
          <button 
            onClick={() => toggleLayer("sentence")}
            className="flex w-full items-center justify-between p-6 bg-[var(--color-muted)]/10 hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            <span className="font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Gap Qurilishi (Sentence)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-orange-500/20 text-orange-500 px-2 py-1 rounded">{sentenceItems.length} ta xato</span>
              {openLayer === "sentence" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>
          
          {openLayer === "sentence" && (
            <div className="p-6 border-t border-[var(--color-border)]/50 space-y-4">
              {sentenceItems.map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-muted)]/5">
                  <p className="text-sm font-bold text-red-500 line-through decoration-red-500/50 mb-2">
                    {item.text || "Original sentence text"}
                  </p>
                  <p className="text-sm font-bold text-emerald-500 mb-3">
                    {item.suggested_rewrite_uz || "Tavsiya qilingan variant"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.issues?.map((issue, j) => (
                      <span key={j} className="text-[10px] font-mono bg-[var(--color-border)]/50 px-2 py-0.5 rounded">{issue.code}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Word Accordion */}
      {wordItems.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] overflow-hidden">
          <button 
            onClick={() => toggleLayer("word")}
            className="flex w-full items-center justify-between p-6 bg-[var(--color-muted)]/10 hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            <span className="font-bold text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" /> So'z Boyligi (Vocabulary)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded">{wordItems.length} ta tavsiya</span>
              {openLayer === "word" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>
          
          {openLayer === "word" && (
            <div className="p-6 border-t border-[var(--color-border)]/50 grid gap-4 grid-cols-1 sm:grid-cols-2">
              {wordItems.map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-muted)]/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-red-500">{item.word}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)]">Quyidagilarga almashtiring:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.suggestions?.map((sugg, j) => (
                      <div key={j} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">
                        {sugg.lemma} <span className="opacity-50">({sugg.cefr})</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-muted-fg)]">{item.rationale_uz}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phoneme Accordion */}
      {phonemeItems.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] overflow-hidden">
          <button 
            onClick={() => toggleLayer("phoneme")}
            className="flex w-full items-center justify-between p-6 bg-[var(--color-muted)]/10 hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            <span className="font-bold text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-500" /> Talaffuz (Pronunciation)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-indigo-500/20 text-indigo-500 px-2 py-1 rounded">{phonemeItems.length} ta so'z</span>
              {openLayer === "phoneme" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>
          
          {openLayer === "phoneme" && (
            <div className="p-6 border-t border-[var(--color-border)]/50 space-y-4">
              <p className="text-sm text-[var(--color-muted-fg)]">Siz ushbu so'zlarning talaffuzida xatoliklarga yo'l qo'ygansiz. GOP (Goodness of Pronunciation) ko'rsatkichlari keltirilgan.</p>
              <div className="flex flex-wrap gap-3">
                {phonemeItems.map((item, i) => (
                  <div key={i} className="flex flex-col border border-[var(--color-border)]/50 rounded-lg p-2 bg-[var(--color-bg)]">
                    <span className="font-bold">{item.word}</span>
                    <span className="text-[10px] text-red-500">GOP: {formatBand(item.gop)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

type SentenceIssue = { code: string };
type SentenceItem = {
  text?: string;
  suggested_rewrite_uz?: string;
  issues?: SentenceIssue[];
};
type WordItem = {
  word?: string;
  rationale_uz?: string;
  suggestions?: { lemma: string; cefr: string }[];
};
type PhonemeItem = { word?: string; gop?: number };

function flattenSentenceItems(artifacts: FeedbackArtifactOut[]): SentenceItem[] {
  return artifacts.flatMap((artifact) => {
    const annotations = artifact.payload.annotations;
    if (Array.isArray(annotations)) return annotations as SentenceItem[];
    return [artifact.payload as SentenceItem];
  });
}

function flattenWordItems(artifacts: FeedbackArtifactOut[]): WordItem[] {
  return artifacts.flatMap((artifact) => {
    const items = artifact.payload.items;
    if (Array.isArray(items)) return items as WordItem[];
    return [artifact.payload as WordItem];
  });
}

function flattenPhonemeItems(artifacts: FeedbackArtifactOut[]): PhonemeItem[] {
  return artifacts.flatMap((artifact) => {
    const items = artifact.payload.items;
    if (Array.isArray(items)) return items as PhonemeItem[];
    return [artifact.payload as PhonemeItem];
  });
}

function formatBand(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
}
