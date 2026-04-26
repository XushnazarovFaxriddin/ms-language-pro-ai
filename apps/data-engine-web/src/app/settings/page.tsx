import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { Settings, Shield, Bell, Cpu, Globe, Lock } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireAdmin("/settings");

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-slate-400" />
            Sozlamalar
          </h1>
          <p className="mt-2 text-slate-400">
            Content Studio platformasi va AI modellarini sozlash.
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl">
          <section className="space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              AI Modellari
            </h2>
            <div className="grid gap-4">
              {[
                { name: "Generation Model", current: "GPT-4o", desc: "Savollarni yaratish uchun asosiy model." },
                { name: "Validation Model (Jury)", current: "Claude 3.5 Sonnet", desc: "Savollarni tekshirish uchun ishlatiladigan model." },
                { name: "Embedding Model", current: "text-embedding-3-small", desc: "Dublikatlarni aniqlash uchun." },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between p-6 rounded-3xl border border-slate-800/60 bg-black/40 backdrop-blur-xl">
                  <div>
                    <h3 className="font-bold text-slate-200">{s.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{s.current}</span>
                    <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors">O'zgartirish</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Xavfsizlik va Kirish
            </h2>
            <div className="grid gap-4">
              {[
                { name: "API Key boshqaruvi", icon: Lock, desc: "S2S integratsiyalar uchun kalitlar." },
                { name: "Admin rollari", icon: Globe, desc: "Foydalanuvchi huquqlarini boshqarish." },
                { name: "Bildirishnomalar", icon: Bell, desc: "Email va Slack xabarlari." },
              ].map((s) => (
                <div key={s.name} className="group flex items-center justify-between p-6 rounded-3xl border border-slate-800/60 bg-black/40 backdrop-blur-xl hover:border-blue-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200">{s.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                    </div>
                  </div>
                  <button className="text-slate-500 group-hover:text-white transition-colors">
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-2xl bg-yellow-500/5 p-4 border border-yellow-500/10 text-xs text-slate-400">
          <span className="font-bold text-yellow-500 uppercase tracking-widest block mb-1">Eslatma</span>
          Ushbu sahifa hozircha demo rejimida ishlamoqda. Real sozlamalar kelajakdagi yangilanishlarda qo'shiladi.
        </div>
      </div>
    </AdminShell>
  );
}
