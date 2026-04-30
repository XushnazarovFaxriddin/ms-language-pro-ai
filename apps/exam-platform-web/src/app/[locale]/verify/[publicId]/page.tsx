import { ShieldCheck, ShieldX, Award } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { api } from "@/lib/api";

type VerifyOut = {
  valid: boolean;
  reason?: string;
  public_id?: string;
  display_name?: string;
  exam_name?: string;
  overall_band?: number;
  cefr_level?: string;
  bands?: Record<string, number>;
  issued_at?: string;
  sha256?: string;
  revoked_at?: string;
};

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ publicId: string; locale: string }>;
}) {
  const { publicId } = await params;
  const t = await getTranslations("Verify");

  let result: VerifyOut;
  try {
    result = (await (api.exam as any).verifyCertificate(publicId)) as VerifyOut;
  } catch (err) {
    result = { valid: false, reason: "lookup_error" };
  }

  return (
    <main className="container mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-[var(--color-border)] bg-white/5 p-10 shadow-sm backdrop-blur-md dark:bg-black/20">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {result.valid ? <ShieldCheck className="h-10 w-10" /> : <ShieldX className="h-10 w-10 text-red-500" />}
        </div>
        <h1 className="text-center text-3xl font-extrabold tracking-tight">
          {result.valid ? t("validTitle") : t("invalidTitle")}
        </h1>
        <p className="mt-2 text-center text-[var(--color-muted-fg)]">
          {result.valid ? t("validSubtitle") : reasonMessage(result.reason, t)}
        </p>

        {result.valid && (
          <div className="mt-8 space-y-4">
            <Row label={t("name")} value={result.display_name || "—"} />
            <Row label={t("exam")} value={result.exam_name || "—"} />
            <Row label={t("overallBand")} value={result.overall_band?.toFixed(1) ?? "—"} highlight />
            <Row label={t("cefr")} value={result.cefr_level ?? "—"} highlight />
            {result.bands && Object.keys(result.bands).length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(result.bands).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-center"
                  >
                    <div className="text-xs uppercase tracking-wider text-[var(--color-muted-fg)]">{k}</div>
                    <div className="mt-1 text-xl font-bold">{Number(v).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            )}
            <Row label={t("publicId")} value={result.public_id || ""} mono />
            <Row label={t("sha256")} value={(result.sha256 || "").slice(0, 32) + "…"} mono />
            {result.issued_at && (
              <Row label={t("issuedAt")} value={new Date(result.issued_at).toLocaleString()} />
            )}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-[var(--color-muted-fg)]">
          <Award className="h-4 w-4" />
          aiexam.uz / LanguagePro AI
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/50 py-2">
      <span className="text-sm text-[var(--color-muted-fg)]">{label}</span>
      <span
        className={`${mono ? "font-mono text-xs" : highlight ? "text-lg font-bold" : "text-sm font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

function reasonMessage(reason: string | undefined, t: (k: string) => string): string {
  switch (reason) {
    case "revoked":
      return t("reasonRevoked");
    case "not_found":
      return t("reasonNotFound");
    case "lookup_error":
      return t("reasonLookupError");
    default:
      return t("reasonGeneric");
  }
}
