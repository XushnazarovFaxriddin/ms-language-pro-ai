"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Download, Copy, Check, ShieldCheck, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type CertificateOut = {
  public_id: string;
  sha256: string;
  issued_at: string;
  verify_url: string;
  pdf_base64?: string;
  already_issued?: boolean;
  overall_band?: number;
  cefr_level?: string;
};

export function CertificatePanel({ attemptId }: { attemptId: string }) {
  const t = useTranslations("Certificate");
  const [cert, setCert] = useState<CertificateOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = (await (api.exam as any).issueCertificate(attemptId)) as CertificateOut;
      setCert(result);
      if (result.pdf_base64) {
        downloadPdf(result.pdf_base64, result.public_id);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : (err as Error).message;
      setError(msg || t("error"));
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!cert?.pdf_base64) {
      // Already-issued path: fetch raw PDF
      window.open(`/api/exam/v1/attempts/${attemptId}/certificate.pdf`, "_blank");
      return;
    }
    downloadPdf(cert.pdf_base64, cert.public_id);
  };

  const copyVerify = async () => {
    if (!cert) return;
    const url = `${window.location.origin}/verify/${cert.public_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* fallthrough */
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white/5 p-8 shadow-sm backdrop-blur-md dark:bg-black/20">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Award className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-fg)]">{t("subtitle")}</p>
        </div>
      </div>

      {!cert && (
        <div className="mt-6">
          <button
            onClick={issue}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            {busy ? t("issuing") : t("issue")}
          </button>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      )}

      {cert && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label={t("publicId")} value={cert.public_id} mono />
            <Info label={t("sha256")} value={cert.sha256.slice(0, 16) + "…"} mono />
          </div>
          {(cert.overall_band || cert.cefr_level) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cert.overall_band !== undefined && (
                <Info label={t("overallBand")} value={cert.overall_band.toFixed(1)} />
              )}
              {cert.cefr_level && <Info label={t("cefr")} value={cert.cefr_level} />}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={download}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              {t("download")}
            </button>
            <button
              onClick={copyVerify}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/5 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-white/10"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copyVerify")}
            </button>
            <a
              href={`/verify/${cert.public_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/5 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-white/10"
            >
              <ShieldCheck className="h-4 w-4" />
              {t("verify")}
            </a>
          </div>
          {cert.already_issued && (
            <p className="text-xs text-[var(--color-muted-fg)]">{t("alreadyIssued")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-bg)] px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-[var(--color-muted-fg)]">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono text-sm" : "text-base font-semibold"}`}>{value}</div>
    </div>
  );
}

function downloadPdf(base64: string, publicId: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LanguagePro-Certificate-${publicId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
