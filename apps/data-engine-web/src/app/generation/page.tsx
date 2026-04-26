import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { GenerationForm } from "./GenerationForm";

export default async function GenerationPage() {
  const user = await requireAdmin("/generation");
  return (
    <AdminShell user={user}>
      <main className="px-8 py-10">
        <h1 className="text-3xl font-bold">Savol generatsiyasi</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-fg)]">
          AI bilan IELTS savollar yaratish. Har bir savol uchun:
          embedding → dublikat tekshiruvi → 3-juror validatsiya → CEFR klassifikatsiya → IRT cold-start.
        </p>
        <div className="mt-8 max-w-xl">
          <GenerationForm />
        </div>
      </main>
    </AdminShell>
  );
}
