import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import { JobPoller } from "./JobPoller";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin(`/generation/jobs/${id}`);
  const ck = await getCookieHeader();
  const job = await api.generation.get(id, ck);
  const copy = getAdminCopy(user.locale).generation;

  return (
    <AdminShell user={user}>
      <main className="px-8 py-10">
        <h1 className="text-2xl font-bold">{copy.jobTitle}</h1>
        <p className="mt-1 font-mono text-xs text-[var(--color-muted-fg)]">{id}</p>
        <JobPoller jobId={id} initial={job} copy={copy} />
      </main>
    </AdminShell>
  );
}
