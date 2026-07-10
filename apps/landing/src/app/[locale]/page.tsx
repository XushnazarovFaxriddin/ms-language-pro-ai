"use client";

import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { 
  Play, 
  ArrowRight, 
  CheckCircle2, 
  LayoutDashboard, 
  BrainCircuit, 
  ShieldCheck, 
  Globe2, 
  Sparkles, 
  Zap, 
  GraduationCap,
  Cpu,
  Monitor,
  Trophy,
  MousePointer2
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero3D } from "@/components/Hero3D";
import { useRef, useEffect, useState } from "react";

const EXAM_APP_URL = process.env.NEXT_PUBLIC_EXAM_WEB_URL || "https://app.aiexam.uz";
const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_WEB_URL || "https://admin.aiexam.uz";

export default function HomePage() {
  const t = useTranslations("Landing");
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const scrollVelocity = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);
  const titleY = useTransform(scrollYProgress, [0, 0.15], [0, -100]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 60 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col bg-white dark:bg-[#050505] text-slate-900 dark:text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Noise Overlay */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Cursor Follower Glow */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(37, 99, 235, 0.08), transparent 80%)`
        }}
      />

      <Header />
      
      <main className="flex-1">
        {/* Hero Section - Optimized for Responsiveness */}
        <section className="relative min-h-[80vh] lg:min-h-screen flex items-center pt-24 lg:pt-32 pb-12 overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container relative z-10 mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Side: Content Hierarchy */}
              <div className="lg:col-span-7 text-left order-2 lg:order-1">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6 lg:mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs lg:text-sm font-black tracking-widest text-blue-400 backdrop-blur-3xl uppercase"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
                  {t("hero.socialProof")}
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.8 }}
                  className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] mb-6 lg:mb-8"
                >
                  <span className="block text-slate-900 dark:text-white">
                    {t("hero.title")}
                  </span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 italic">
                    {t("hero.titleHighlight")}
                  </span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="max-w-xl text-lg lg:text-xl xl:text-2xl font-medium leading-relaxed text-slate-400 mb-8 lg:mb-12"
                >
                  {t("hero.description")}
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6"
                >
                  <a href={`${EXAM_APP_URL}/login`} className="group relative flex w-full sm:w-auto items-center justify-center gap-4 overflow-hidden rounded-2xl lg:rounded-3xl bg-blue-600 px-8 lg:px-12 py-4 lg:py-5 text-lg lg:text-xl font-black text-white transition-all hover:bg-blue-500 hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)]">
                    {t("hero.startFree")}
                    <ArrowRight className="h-5 w-5 lg:h-6 lg:w-6 transition-transform group-hover:translate-x-1" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </a>
                  <button className="flex w-full sm:w-auto items-center justify-center gap-4 rounded-2xl lg:rounded-3xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-8 lg:px-12 py-4 lg:py-5 text-lg lg:text-xl font-bold text-slate-900 dark:text-white backdrop-blur-3xl transition-all hover:bg-slate-100 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/30">
                    <Play className="h-5 w-5 lg:h-6 lg:w-6 fill-current text-blue-500" />
                    {t("hero.watchDemo")}
                  </button>
                </motion.div>
              </div>

              {/* Right Side: 3D Visual + Status Cards */}
              <div className="lg:col-span-5 relative order-1 lg:order-2 h-[350px] sm:h-[450px] lg:h-[600px] flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                   <Hero3D />
                </div>
                
                {/* Expert UI Overlays - Floating Cards (Scaled for responsiveness) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute top-4 right-0 lg:-right-4 z-20 w-44 lg:w-56 rounded-2xl lg:rounded-3xl border border-white/10 bg-black/40 p-4 lg:p-6 backdrop-blur-2xl shadow-2xl"
                >
                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="size-4 lg:size-5" />
                    </div>
                    <span className="text-[10px] lg:text-xs font-black text-slate-300">Accuracy</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-black text-white">±0.5 Band</div>
                  <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "98%" }}
                      transition={{ delay: 1.2, duration: 2 }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-10 left-0 lg:-left-4 z-20 w-56 lg:w-64 rounded-[2rem] lg:rounded-[2.5rem] border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 p-6 lg:p-8 backdrop-blur-3xl shadow-2xl"
                >
                  <div className="absolute -left-3 -top-3 lg:-left-4 lg:-top-4 flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl lg:rounded-2xl bg-blue-600 text-white shadow-xl">
                    <GraduationCap className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <p className="text-base lg:text-lg font-bold italic leading-tight text-slate-900 dark:text-white/90">
                    &ldquo;{t("hero.mission")}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1 flex-1 bg-blue-500/20 rounded-full" />
                    <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-blue-400">Mission</span>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section id="features" className="relative py-24 lg:py-48 px-6">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial="initial" whileInView="whileInView" variants={staggerContainer}
              className="mb-16 lg:mb-32 text-center"
            >
              <motion.h2 variants={fadeUp} className="text-5xl font-black tracking-tight sm:text-7xl lg:text-9xl text-slate-900 dark:text-white">
                Next-Gen <span className="text-blue-500">Intelligence</span>
              </motion.h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 lg:gap-6 h-auto">
              {/* Large Bento Card */}
              <BentoCard 
                className="md:col-span-4 md:row-span-2 min-h-[300px] lg:min-h-[600px]"
                icon={LayoutDashboard}
                title="Adaptive Assessment"
                desc="Item Response Theory (IRT) modelimiz orqali darajangizni soniyalar ichida aniqlaymiz."
                image="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2000"
                href={EXAM_APP_URL}
              />
              
              <BentoCard 
                className="md:col-span-2 md:row-span-1 min-h-[250px] lg:min-h-0"
                icon={BrainCircuit}
                title="AI Studio"
                desc="Ekspertlar uchun savol generatsiyasi va avtomatik kalibratsiya."
                image="/images/ai-studio.png"
                href={ADMIN_APP_URL}
              />

              <BentoCard 
                className="md:col-span-2 md:row-span-2 min-h-[300px] lg:min-h-0"
                icon={ShieldCheck}
                title="Verified"
                desc="Kriptografik imzolangan va tekshiriluvchi rasmiy sertifikatlar."
                image="/images/verified.png"
                href="#"
              />

              <BentoCard 
                className="md:col-span-2 md:row-span-1 min-h-[250px] lg:min-h-0"
                icon={Cpu}
                title="AI Assessor"
                desc="±0.5 band score aniqligidagi Speaking va Writing baholash."
                image="/images/assessor.png"
                href="#"
              />
              
              <BentoCard 
                className="md:col-span-2 md:row-span-1 min-h-[250px] lg:min-h-0"
                icon={Trophy}
                title="Local Focus"
                desc="Uzbek tilidagi tahlil va Click/Payme to'lov tizimlari."
                image="/images/local.png"
                href="#"
              />
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="relative py-24 lg:py-32 px-6 overflow-hidden">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial="initial" whileInView="whileInView" variants={fadeUp}
              className="mb-16 lg:mb-20 text-center"
            >
              <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">{t("howItWorks.title")}</h2>
              <p className="mt-4 text-lg lg:text-xl text-slate-600 dark:text-slate-400">{t("howItWorks.subtitle")}</p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-3 relative">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent hidden lg:block -translate-y-1/2" />
              
              <StepItem 
                number="01"
                title={t("howItWorks.step1.title")}
                desc={t("howItWorks.step1.description")}
                icon={Monitor}
              />
              <StepItem 
                number="02"
                title={t("howItWorks.step2.title")}
                desc={t("howItWorks.step2.description")}
                icon={BrainCircuit}
              />
              <StepItem 
                number="03"
                title={t("howItWorks.step3.title")}
                desc={t("howItWorks.step3.description")}
                icon={GraduationCap}
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 lg:py-32 bg-blue-600">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-gap-16 md:grid-cols-3 text-center">
              {[
                { label: t("stats.exams"), value: "50,000+" },
                { label: t("stats.accuracy"), value: "±0.5 Band" },
                { label: t("stats.partners"), value: "10+" },
              ].map((s) => (
                <motion.div key={s.label} initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}>
                  <p className="text-5xl lg:text-6xl font-black text-white mb-2">{s.value}</p>
                  <p className="text-base lg:text-lg font-bold text-blue-100 uppercase tracking-widest">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 lg:py-48 px-6">
          <div className="container mx-auto max-w-3xl">
            <motion.h2 initial="initial" whileInView="whileInView" variants={fadeUp} className="text-3xl lg:text-4xl font-black text-center mb-12 lg:mb-16 dark:text-white">{t("faq.title")}</motion.h2>
            <div className="space-y-6">
              <FaqItem 
                q={t("faq.q1")} 
                a={t("faq.a1")}
              />
              <FaqItem 
                q={t("faq.q2")} 
                a={t("faq.a2")}
              />
              <FaqItem 
                q={t("faq.q3")} 
                a={t("faq.a3")}
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-blue-600 to-indigo-900 px-10 py-24 text-center shadow-2xl"
            >
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
              <h2 className="relative z-10 text-5xl font-black text-white sm:text-8xl">{t("cta.title")}</h2>
              <p className="relative z-10 mt-8 text-xl text-blue-100 max-w-2xl mx-auto">{t("cta.subtitle")}</p>
              <div className="relative z-10 mt-12 flex justify-center">
                <a href={`${EXAM_APP_URL}/login`} className="rounded-full bg-white px-12 py-5 text-xl font-black text-blue-600 hover:scale-105 transition-transform shadow-xl">
                  {t("cta.button")}
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function BentoCard({ className, icon: Icon, title, desc, image, href }: { className: string; icon: any; title: string; desc: string; image?: string; href: string }) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative overflow-hidden rounded-[3rem] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-10 transition-all duration-700 hover:border-blue-500/50 hover:shadow-[0_0_80px_-20px_rgba(37,99,235,0.3)] ${className}`}
    >
      {image && (
        <div className="absolute inset-0 z-0">
          <img src={image} className="h-full w-full object-cover opacity-20 grayscale transition-all duration-1000 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-50" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-[#050505] dark:via-[#050505]/40" />
        </div>
      )}
      
      <div className="relative z-10 h-full flex flex-col justify-end">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-white/5 text-blue-400 border border-black/10 dark:border-white/10 shadow-2xl group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400 transition-all duration-500">
          <Icon className="size-8" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter group-hover:text-blue-400 transition-colors">{title}</h3>
        <p className="text-lg text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors line-clamp-2">
          {desc}
        </p>
      </div>
    </motion.a>
  );
}

function StepItem({ number, title, desc, icon: Icon }: { number: string; title: string; desc: string; icon: any }) {
  return (
    <motion.div initial="initial" whileInView="whileInView" variants={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }} className="relative z-10 flex flex-col items-center text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 border-4 border-blue-500/20 text-blue-400 shadow-2xl transition-transform hover:scale-110">
        <Icon className="size-10" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">{number} Step</span>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">{desc}</p>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-6 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <span className="text-lg font-bold text-slate-900 dark:text-white">{q}</span>
        <ArrowRight className={`size-5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
      {isOpen && (
        <div className="p-6 pt-0 text-slate-600 dark:text-slate-400 leading-relaxed animate-in slide-in-from-top-2">
          {a}
        </div>
      )}
    </div>
  );
}

