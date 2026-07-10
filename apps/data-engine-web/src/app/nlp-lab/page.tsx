import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import NLPLabClient from "./NLPLabClient";

export default async function NLPLabPage() {
  const user = await requireAdmin("/nlp-lab");
  const ck = await getCookieHeader();
  let data: Awaited<ReturnType<typeof api.research.nlpOverview>>;
  try {
    data = await api.research.nlpOverview(ck);
  } catch {
    data = {
      total_items: 0,
      validated_items: 0,
      validation_results: 0,
      semantic_embeddings: 0,
      verdicts: {},
      criteria_averages: {},
      quality_gates: {},
      coverage_by_skill: {},
      coverage_by_cefr: {},
      recent_validations: [],
    };
  }

  return (
    <AdminShell user={user}>
      <NLPLabClient initialOverview={data} user={user} />
    </AdminShell>
  );
}

