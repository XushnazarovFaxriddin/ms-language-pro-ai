"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Play, ArrowRight, CheckCircle2, LayoutDashboard, BrainCircuit, ShieldCheck, Globe2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const t = useTranslations("Landing");

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Subtle background gradient blob */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl" aria-hidden="true">
            <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[var(--color-primary-soft)] to-[var(--color-primary)] opacity-20" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
          </div>

          <div className="container mx-auto max-w-7xl px-6 text-center">
            <motion.div 
              className="mx-auto max-w-3xl"
              initial="initial" animate="animate" variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-1 text-sm font-medium text-[var(--color-muted-fg)] backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-[var(--color-success)] mr-2"></span>
                LanguagePro AI 1.0 is live
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-5xl font-extrabold tracking-tight sm:text-7xl">
                {t("hero.title")} <span className="bg-gradient-to-r from-[var(--color-primary)] to-purple-500 bg-clip-text text-transparent">{t("hero.titleHighlight")}</span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-muted-fg)]">
                {t("hero.description")}
              </motion.p>
              
              <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="http://app.localhost/login" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-md">
                  <Play className="size-4" />
                  {t("hero.startFree")}
                </a>
                <a href="#demo" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3.5 text-base font-medium shadow-sm transition-all hover:bg-[var(--color-surface-2)]">
                  {t("hero.watchDemo")}
                </a>
              </motion.div>
              
              <motion.div variants={fadeUp} className="mt-14 flex items-center justify-center gap-x-6 text-sm text-[var(--color-muted-fg)]">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--color-bg)]" src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                  ))}
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex text-yellow-400 text-xs">★★★★★</div>
                  <span className="font-medium">{t("hero.socialProof")}</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-[var(--color-surface-2)] py-24">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to master English</h2>
              <p className="mt-4 text-lg text-[var(--color-muted-fg)]">Our platform provides the most accurate and instant feedback for your language proficiency journey.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <motion.a
                href="http://app.localhost"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <LayoutDashboard className="size-6" />
                </div>
                <h3 className="text-2xl font-semibold">{t("features.exam.title")}</h3>
                <p className="mt-4 leading-relaxed text-[var(--color-muted-fg)]">
                  {t("features.exam.description")}
                </p>
                <div className="mt-8 flex items-center font-medium text-[var(--color-primary)]">
                  Take a test <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.a>

              <motion.a
                href="http://admin.localhost"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <BrainCircuit className="size-6" />
                </div>
                <h3 className="text-2xl font-semibold">{t("features.studio.title")}</h3>
                <p className="mt-4 leading-relaxed text-[var(--color-muted-fg)]">
                  {t("features.studio.description")}
                </p>
                <div className="mt-8 flex items-center font-medium text-purple-600 dark:text-purple-400">
                  Open studio <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.a>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Verified Certificates", desc: "Cryptographically signed PDF certificates instantly issued upon completion." },
                { icon: Globe2, title: "Adaptive Difficulty", desc: "Item Response Theory precisely measures your band score in half the time." },
                { icon: CheckCircle2, title: "Detailed Feedback", desc: "Line-by-line feedback on your speaking and writing from advanced AI models." }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-fg)]">
                    <feature.icon className="size-5" />
                  </div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-[var(--color-muted-fg)] leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
