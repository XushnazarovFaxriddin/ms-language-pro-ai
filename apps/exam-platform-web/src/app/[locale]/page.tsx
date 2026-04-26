import { redirect } from "next/navigation";
import { tryGetUser } from "@/lib/auth-server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await tryGetUser();
  
  if (user) {
    redirect(`/${locale}/exams`);
  } else {
    redirect(`/${locale}/login`);
  }
}
