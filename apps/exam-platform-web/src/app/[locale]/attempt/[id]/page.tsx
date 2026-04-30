import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";
import { ExamRunner } from "./ExamRunner";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/attempt/${id}`);
  const ck = await getCookieHeader();
  const attempt = await api.exam.getAttempt(id, ck);

  return (
    <>
      <AppHeader user={user} />
      <ExamRunner attemptId={id} initialAttempt={attempt} />
    </>
  );
}
