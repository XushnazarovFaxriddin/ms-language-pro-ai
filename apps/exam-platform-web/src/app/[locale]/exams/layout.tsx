import { ReactNode } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { requireUser } from "@/lib/auth-server";

export default async function ExamsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser("/exams");
  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
