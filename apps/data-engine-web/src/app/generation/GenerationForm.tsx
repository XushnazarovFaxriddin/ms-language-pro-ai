"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";

const SKILLS = [
  { v: "reading", l: "Reading" },
  { v: "listening", l: "Listening" },
  { v: "writing", l: "Writing" },
  { v: "speaking", l: "Speaking" },
];

const LEVELS = ["A2", "B1", "B2", "C1", "C2"];

export function GenerationForm() {
  const router = useRouter();
  const [skill, setSkill] = useState("reading");
  const [cefr, setCefr] = useState("B1");
  const [topic, setTopic] = useState("technology and society");
  const [count, setCount] = useState(3);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const job = await api.generation.create({
            skill,
            cefr_level: cefr,
            topic,
            count,
          });
          router.push(`/generation/jobs/${job.id}`);
        } catch (err) {
          setError(err instanceof ApiError ? err.detail : String(err));
          setPending(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Skill">
        <select value={skill} onChange={(e) => setSkill(e.target.value)} className="select">
          {SKILLS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="CEFR daraja">
        <select value={cefr} onChange={(e) => setCefr(e.target.value)} className="select">
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Mavzu">
        <input
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Soni (1-50)">
        <input
          type="number"
          min={1}
          max={50}
          required
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="input"
        />
      </Field>
      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {pending ? "Yuborilmoqda…" : "Generatsiyani boshlash"}
      </button>
      <p className="text-xs text-[var(--color-muted-fg)]">
        Ish navbatga qo&apos;shiladi va arq worker tomonidan ishlanadi. Har bir savol ~10-30s.
      </p>
      <style>{`
        .input, .select {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          outline: none;
          width: 100%;
        }
        .input:focus, .select:focus { border-color: var(--color-primary); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
