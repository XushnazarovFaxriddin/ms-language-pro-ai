import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { ConversationClient } from "./ConversationClient";

export default async function ConversationPage() {
  const t = await getTranslations("Conversation");

  return (
    <div className="mx-auto max-w-5xl space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-[var(--color-primary)]" />
          {t("title")}
        </h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          {t("description")}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ConversationClient />
      </div>
    </div>
  );
}
