"use client";

import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { Play, ArrowRight, CheckCircle2, LayoutDashboard, BrainCircuit, ShieldCheck, Globe2, Sparkles, Zap, GraduationCap } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero3D } from "@/components/Hero3D";
import { useRef } from "react";

export default function HomePage() {
  const t = useTranslations("Landing");
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  const fadeUp = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-blue-500/30">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
          {/* 3D Background */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.div 
              style={{ opacity: heroOpacity, scale: heroScale }}
              className="h-full w-full"
            >
              <Hero3D />
            </motion.div>
          </div>

          {/* Animated Background Blobs */}
          <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

          <div className="container relative z-10 mx-auto max-w-7xl px-6 text-center">
            <motion.div 
              className="mx-auto max-w-4xl"
              initial="initial" animate="animate" variants={staggerContainer}
            >
              <motion.div 
                variants={fadeUp}
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold tracking-wide text-blue-400 backdrop-blur-xl"
              >
                <Sparkles className="h-4 w-4" />
                LanguagePro AI 1.0 is live
              </motion.div>
              
              <motion.h1 
                variants={fadeUp} 
                className="text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40"
              >
                {t("hero.title")} <br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </motion.h1>
              
              <motion.p 
                variants={fadeUp} 
                className="mx-auto mt-10 max-w-2xl text-xl leading-relaxed text-slate-400"
              >
                {t("hero.description")}
              </motion.p>
              
              <motion.div 
                variants={fadeUp} 
                className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6"
              >
                <a href="http://app.localhost/login" className="group relative flex w-full sm:w-auto items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-10 py-4 text-lg font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95">
                  <Play className="h-5 w-5 fill-current" />
                  {t("hero.startFree")}
                </a>
                <a href="#features" className="flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-10 py-4 text-lg font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20">
                  {t("hero.watchDemo")}
                </a>
              </motion.div>
              
              <motion.div 
                variants={fadeUp} 
                className="mt-20 flex items-center justify-center gap-x-8"
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <img 
                      key={i} 
                      className="inline-block h-10 w-10 rounded-full ring-2 ring-[#050505] grayscale hover:grayscale-0 transition-all cursor-pointer" 
                      src={`https://i.pravatar.cc/150?img=${i+20}`} 
                      alt="" 
                    />
                  ))}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex text-blue-400 text-xs gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Zap key={s} className="h-3 w-3 fill-current" />)}
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t("hero.socialProof")}</span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Motivational Quote Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute right-10 top-1/2 hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="group relative max-w-xs rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-2xl transition-all hover:bg-white/10"
            >
              <div className="absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <p className="text-lg font-bold italic leading-relaxed text-white">
                &ldquo;Bilim — bu kuch, AI — bu imkoniyat. O&apos;z kelajagingizni biz bilan bugundan yarating.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">LanguagePro Mission</span>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            style={{ opacity: heroOpacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-500"
          >
            <ArrowRight className="h-6 w-6 rotate-90" />
          </motion.div>
        </section>

        {/* Features Grid */}
        <section id="features" className="relative py-32 px-6">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial="initial"
              whileInView="whileInView"
              variants={staggerContainer}
              className="mb-24 text-center"
            >
              <motion.h2 variants={fadeUp} className="text-4xl font-black tracking-tight sm:text-6xl text-white">
                Everything you need to <span className="text-blue-500">master English</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-xl text-slate-400">
                Our platform provides the most accurate and instant feedback for your language proficiency journey.
              </motion.p>
            </motion.div>

            <div className="grid gap-10 md:grid-cols-2">
              <FeatureCard 
                href="http://app.localhost"
                icon={LayoutDashboard}
                title={t("features.exam.title")}
                desc={t("features.exam.description")}
                color="blue"
              />
              <FeatureCard 
                href="http://admin.localhost"
                icon={BrainCircuit}
                title={t("features.studio.title")}
                desc={t("features.studio.description")}
                color="purple"
              />
            </div>

            <motion.div 
              initial="initial"
              whileInView="whileInView"
              variants={staggerContainer}
              className="mt-32 grid gap-12 sm:grid-cols-3"
            >
              <MiniFeature 
                icon={ShieldCheck} 
                title="Verified Certificates" 
                desc="Cryptographically signed PDF certificates instantly issued upon completion." 
              />
              <MiniFeature 
                icon={Globe2} 
                title="Adaptive Difficulty" 
                desc="Item Response Theory precisely measures your band score in half the time." 
              />
              <MiniFeature 
                icon={GraduationCap} 
                title="Detailed Feedback" 
                desc="Line-by-line feedback on your speaking and writing from advanced AI models." 
              />
            </motion.div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function FeatureCard({ href, icon: Icon, title, desc, color }: { href: string; icon: any; title: string; desc: string; color: "blue" | "purple" }) {
  const colorMap = {
    blue: "from-blue-500/20 to-indigo-500/5 group-hover:border-blue-500/50 text-blue-400 shadow-blue-500/10",
    purple: "from-purple-500/20 to-pink-500/5 group-hover:border-purple-500/50 text-purple-400 shadow-purple-500/10",
  };

  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative overflow-hidden rounded-[40px] border border-white/5 bg-white/5 p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${colorMap[color]}`}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-current opacity-10 blur-[80px] transition-transform group-hover:scale-150" />
      
      <div className="relative z-10">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-black/40 text-current shadow-inner border border-white/5">
          <Icon className="size-10" />
        </div>
        <h3 className="text-4xl font-black text-white">{title}</h3>
        <p className="mt-6 text-lg leading-relaxed text-slate-400">
          {desc}
        </p>
        <div className="mt-10 flex items-center font-black text-white uppercase tracking-widest text-sm">
          Explore now <ArrowRight className="ml-3 size-5 transition-transform group-hover:translate-x-2" />
        </div>
      </div>
    </motion.a>
  );
}

function MiniFeature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="flex flex-col gap-6 p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Icon className="size-7" />
      </div>
      <div>
        <h4 className="text-xl font-bold text-white mb-3">{title}</h4>
        <p className="text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}
