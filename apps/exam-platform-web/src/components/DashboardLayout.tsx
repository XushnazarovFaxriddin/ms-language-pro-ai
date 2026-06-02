"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { User } from "@/lib/api";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

export function DashboardLayout({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-transparent transition-transform duration-300 ease-in-out sm:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <DashboardSidebar />
      </div>


      <div className="flex flex-1 flex-col sm:ml-64">
        <DashboardHeader user={user} onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-6 sm:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
