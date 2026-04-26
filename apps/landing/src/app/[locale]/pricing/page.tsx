"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PricingPage() {
  const t = useTranslations("Pricing");

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" }
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Header />
      
      <main className="flex-1">
        <section className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <motion.div 
            initial="initial" animate="animate" variants={fadeUp}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{t("title")}</h1>
            <p className="mt-6 text-xl leading-8 text-[var(--color-muted-fg)]">{t("description")}</p>
            
            <div className="mt-10 flex justify-center items-center gap-3">
              <span className="text-sm font-semibold">{t("monthlyToggle")}</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[var(--color-primary)]">
                <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition" />
              </button>
              <span className="text-sm font-semibold flex items-center gap-2">
                {t("yearlyToggle")} 
                <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-xs text-[var(--color-success-fg)]">Save 17%</span>
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial="initial" animate="animate" variants={stagger}
            className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-none lg:grid-cols-4 lg:gap-8"
          >
            {/* Free Plan */}
            <motion.div variants={fadeUp} className="flex flex-col justify-between rounded-3xl bg-[var(--color-surface)] p-8 ring-1 ring-[var(--color-border)] xl:p-10 transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8">{t("plans.free.name")}</h3>
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{t("plans.free.price")}</span>
                  <span className="text-sm font-semibold leading-6 text-[var(--color-muted-fg)]">{t("perMonth")}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[var(--color-muted-fg)]">
                  {[0, 1].map((i) => (
                    <li key={i} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-[var(--color-primary)]" aria-hidden="true" />
                      {t(`plans.free.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="http://app.localhost/login" className="mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 bg-[var(--color-surface-2)] text-[var(--color-fg)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors">
                {t("plans.free.cta")}
              </a>
            </motion.div>

            {/* Starter Plan */}
            <motion.div variants={fadeUp} className="flex flex-col justify-between rounded-3xl bg-[var(--color-surface)] p-8 ring-1 ring-[var(--color-border)] xl:p-10 transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8">{t("plans.starter.name")}</h3>
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{t("plans.starter.price")}</span>
                  <span className="text-sm font-semibold leading-6 text-[var(--color-muted-fg)]">{t("perMonth")}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[var(--color-muted-fg)]">
                  {[0, 1].map((i) => (
                    <li key={i} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-[var(--color-primary)]" aria-hidden="true" />
                      {t(`plans.starter.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="http://app.localhost/login" className="mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 bg-[var(--color-surface-2)] text-[var(--color-fg)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors">
                {t("plans.starter.cta")}
              </a>
            </motion.div>

            {/* Pro Plan */}
            <motion.div variants={fadeUp} className="relative flex flex-col justify-between rounded-3xl bg-[var(--color-surface)] p-8 shadow-xl ring-2 ring-[var(--color-primary)] xl:p-10 transform lg:-translate-y-4">
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-[var(--color-primary)]">{t("plans.pro.name")}</h3>
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold leading-5 text-[var(--color-primary-fg)]">
                    {t("plans.pro.badge")}
                  </span>
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{t("plans.pro.price")}</span>
                  <span className="text-sm font-semibold leading-6 text-[var(--color-muted-fg)]">{t("perMonth")}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[var(--color-muted-fg)]">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-[var(--color-primary)]" aria-hidden="true" />
                      <span className="text-[var(--color-fg)]">{t(`plans.pro.features.${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href="http://app.localhost/login" className="mt-8 block rounded-md bg-[var(--color-primary)] px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors">
                {t("plans.pro.cta")}
              </a>
            </motion.div>

            {/* Team Plan */}
            <motion.div variants={fadeUp} className="flex flex-col justify-between rounded-3xl bg-[var(--color-surface)] p-8 ring-1 ring-[var(--color-border)] xl:p-10 transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8">{t("plans.team.name")}</h3>
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight">{t("plans.team.price")}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-[var(--color-muted-fg)]">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-[var(--color-primary)]" aria-hidden="true" />
                      {t(`plans.team.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="mailto:hi@aiexam.uz" className="mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 bg-[var(--color-surface-2)] text-[var(--color-fg)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-surface-3)] transition-colors">
                {t("plans.team.cta")}
              </a>
            </motion.div>
          </motion.div>
          
          <div className="mt-20 flex items-center justify-center gap-2 text-sm text-[var(--color-muted-fg)]">
            <Info className="size-4" /> Barcha to'lovlar xavfsiz va shifrlangan. 14 kunlik pulni qaytarish kafolati (faqat Pro tarifida).
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
