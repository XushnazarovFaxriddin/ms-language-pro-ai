"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Info, Sparkles, Zap, ShieldCheck, Crown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const EXAM_APP_URL = process.env.NEXT_PUBLIC_EXAM_WEB_URL || "https://app.aiexam.uz";

export default function PricingPage() {
  const t = useTranslations("Pricing");

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  const stagger = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-white">
      <Header />
      
      <main className="flex-1 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

        <section className="container relative z-10 mx-auto max-w-7xl px-6 py-32">
          <motion.div 
            initial="initial" whileInView="whileInView" variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold tracking-wide text-blue-400 backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Eng maqbul narxlar
            </div>
            <h1 className="text-5xl font-black tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
              {t("title")}
            </h1>
            <p className="mt-8 text-xl leading-relaxed text-slate-400">{t("description")}</p>
            
            <div className="mt-12 flex justify-center items-center gap-4">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t("monthlyToggle")}</span>
              <button className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-600/20 border border-blue-500/30">
                <span className="inline-block h-5 w-5 translate-x-8 transform rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-transform duration-300" />
              </button>
              <span className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                {t("yearlyToggle")} 
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400">SAVE 17%</span>
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial="initial" whileInView="whileInView" variants={stagger}
            className="mx-auto mt-24 grid max-w-lg grid-cols-1 gap-8 sm:mt-32 lg:max-w-none lg:grid-cols-4"
          >
            {/* Free Plan */}
            <PricingCard 
              name={t("plans.free.name")}
              price={t("plans.free.price")}
              perMonth={t("perMonth")}
              features={[0, 1].map(i => t(`plans.free.features.${i}`))}
              cta={t("plans.free.cta")}
              href={`${EXAM_APP_URL}/login`}
              icon={Zap}
            />

            {/* Starter Plan */}
            <PricingCard 
              name={t("plans.starter.name")}
              price={t("plans.starter.price")}
              perMonth={t("perMonth")}
              features={[0, 1].map(i => t(`plans.starter.features.${i}`))}
              cta={t("plans.starter.cta")}
              href={`${EXAM_APP_URL}/login`}
              icon={ShieldCheck}
            />

            {/* Pro Plan */}
            <PricingCard 
              name={t("plans.pro.name")}
              price={t("plans.pro.price")}
              perMonth={t("perMonth")}
              features={[0, 1, 2, 3].map(i => t(`plans.pro.features.${i}`))}
              cta={t("plans.pro.cta")}
              href={`${EXAM_APP_URL}/login`}
              icon={Crown}
              featured={true}
              badge={t("plans.pro.badge")}
            />

            {/* Team Plan */}
            <PricingCard 
              name={t("plans.team.name")}
              price={t("plans.team.price")}
              perMonth=""
              features={[0, 1, 2, 3].map(i => t(`plans.team.features.${i}`))}
              cta={t("plans.team.cta")}
              href="mailto:hi@aiexam.uz"
              icon={Sparkles}
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-24 flex items-center justify-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest"
          >
            <ShieldCheck className="size-5 text-emerald-400" /> Barcha to'lovlar xavfsiz va shifrlangan. 14 kunlik kafolat.
          </motion.div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  perMonth, 
  features, 
  cta, 
  href, 
  icon: Icon, 
  featured = false, 
  badge = "" 
}: { 
  name: string; 
  price: string; 
  perMonth: string; 
  features: string[]; 
  cta: string; 
  href: string; 
  icon: any; 
  featured?: boolean; 
  badge?: string;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative flex flex-col justify-between rounded-[40px] p-8 transition-all duration-500 hover:-translate-y-2 ${
        featured 
          ? "bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.3)] ring-4 ring-blue-500/50 scale-105 z-10" 
          : "bg-white/5 border border-white/5 hover:bg-white/10"
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[10px] font-black text-blue-600 uppercase tracking-widest shadow-xl">
          {badge}
        </div>
      )}
      
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className={`p-3 rounded-2xl ${featured ? "bg-white/20" : "bg-blue-500/10 text-blue-400"}`}>
            <Icon className="size-6" />
          </div>
          <h3 className={`text-xl font-black ${featured ? "text-white" : "text-slate-300"}`}>{name}</h3>
        </div>
        
        <div className="mb-10">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tighter">{price}</span>
            {perMonth && <span className={`text-sm font-bold uppercase tracking-widest ${featured ? "text-white/60" : "text-slate-500"}`}>{perMonth}</span>}
          </div>
        </div>
        
        <ul className="space-y-4 mb-10">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full ${featured ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400"}`}>
                <Check className="size-3" />
              </div>
              <span className={`text-sm font-medium ${featured ? "text-white" : "text-slate-400"}`}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <a 
        href={href} 
        className={`w-full rounded-2xl py-4 text-center text-sm font-black uppercase tracking-widest transition-all ${
          featured 
            ? "bg-white text-blue-600 shadow-xl hover:scale-105" 
            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
        }`}
      >
        {cta}
      </a>
    </motion.div>
  );
}
