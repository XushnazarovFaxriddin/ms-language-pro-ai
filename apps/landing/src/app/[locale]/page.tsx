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
    <div ref={containerRef} className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
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
        {/* Hero Section */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
          {/* 3D Background */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.div 
              style={{ opacity: heroOpacity, scale: heroScale }}
              className="h-full w-full"
            >
              <Hero3D />
            </motion.div>
          </div>

          <div className="container relative z-10 mx-auto max-w-7xl px-6">
            <motion.div 
              className="text-center"
              initial="initial" animate="animate" variants={staggerContainer}
              style={{ y: titleY }}
            >
              <motion.div 
                variants={fadeUp}
                className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-black tracking-widest text-blue-400 backdrop-blur-3xl uppercase"
              >
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]" />
                LanguagePro 2.0 Next-Gen AI
              </motion.div>
              
              <motion.h1 
                variants={fadeUp} 
                className="text-7xl font-black tracking-tighter sm:text-[10rem] lg:text-[13rem] leading-[0.8] mb-12"
              >
                <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20">
                  {t("hero.title")}
                </span>
                <span className="block text-white">
                  {t("hero.titleHighlight")}
                </span>
              </motion.h1>
              
              <motion.p 
                variants={fadeUp} 
                className="mx-auto mt-12 max-w-3xl text-2xl font-medium leading-relaxed text-slate-400"
              >
                {t("hero.description")}
              </motion.p>
              
              <motion.div 
                variants={fadeUp} 
                className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8"
              >
                <a href="http://app.localhost/login" className="group relative flex w-full sm:w-auto items-center justify-center gap-4 overflow-hidden rounded-[2rem] bg-white px-12 py-5 text-xl font-black text-black transition-all hover:scale-110 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
                  <Play className="h-6 w-6 fill-current" />
                  {t("hero.startFree")}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </a>
                <a href="#features" className="flex w-full sm:w-auto items-center justify-center gap-4 rounded-[2rem] border border-white/10 bg-white/5 px-12 py-5 text-xl font-bold text-white backdrop-blur-3xl transition-all hover:bg-white/10 hover:border-white/30">
                  <MousePointer2 className="h-6 w-6" />
                  Explore Features
                </a>
              </motion.div>
            </motion.div>
          </div>

          {/* Floating Motivation Quote */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute right-12 bottom-32 hidden 2xl:block"
          >
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="group relative max-w-sm rounded-[3rem] border border-white/10 bg-black/40 p-8 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute -left-4 -top-4 flex h-14 w-14 items-center justify-center rounded-[2rem] bg-blue-600 text-white shadow-2xl">
                <GraduationCap className="h-8 w-8" />
              </div>
              <p className="text-2xl font-black italic leading-tight text-white/90">
                &ldquo;Bilim — bu kuch, AI — bu imkoniyat. O&apos;z kelajagingizni biz bilan bugundan yarating.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-blue-500 to-transparent" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Mission</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Bento Grid */}
        <section id="features" className="relative py-48 px-6">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial="initial" whileInView="whileInView" variants={staggerContainer}
              className="mb-32 text-center"
            >
              <motion.h2 variants={fadeUp} className="text-6xl font-black tracking-tight sm:text-9xl text-white">
                Next-Gen <span className="text-blue-500">Intelligence</span>
              </motion.h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 h-auto md:h-[900px]">
              {/* Large Bento Card */}
              <BentoCard 
                className="md:col-span-4 md:row-span-2"
                icon={LayoutDashboard}
                title="Adaptive Assessment"
                desc="Item Response Theory (IRT) modelimiz orqali darajangizni soniyalar ichida aniqlaymiz."
                image="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2000"
                href="http://app.localhost"
              />
              
              <BentoCard 
                className="md:col-span-2 md:row-span-1"
                icon={BrainCircuit}
                title="AI Studio"
                desc="Ekspertlar uchun savol generatsiyasi."
                href="http://admin.localhost"
              />

              <BentoCard 
                className="md:col-span-2 md:row-span-2"
                icon={ShieldCheck}
                title="Verified"
                desc="Blockchain asosidagi sertifikatlar."
                href="#"
              />

              <BentoCard 
                className="md:col-span-2 md:row-span-1"
                icon={Cpu}
                title="Real-time"
                desc="Speaking tahlili 0.2s ichida."
                href="#"
              />
              
              <BentoCard 
                className="md:col-span-2 md:row-span-1"
                icon={Trophy}
                title="Gamified"
                desc="Leaderboard va yutuqlar."
                href="#"
              />
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="container mx-auto max-w-7xl">
            <motion.div 
              initial="initial" whileInView="whileInView" variants={fadeUp}
              className="mb-20 text-center"
            >
              <h2 className="text-4xl font-black tracking-tight sm:text-6xl text-white">Qanday ishlaydi?</h2>
              <p className="mt-4 text-xl text-slate-400">Atigi 3 qadamda xalqaro sertifikatga ega bo'ling</p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-3 relative">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent hidden lg:block -translate-y-1/2" />
              
              <StepItem 
                number="01"
                title="Test topshirish"
                desc="Adaptiv tizimimiz sizning bilim darajangizga mos savollarni tanlaydi."
                icon={Monitor}
              />
              <StepItem 
                number="02"
                title="AI Tahlili"
                desc="Sizning Speaking va Writing ishlaringiz ilg'or AI modellarimiz tomonidan tahlil qilinadi."
                icon={BrainCircuit}
              />
              <StepItem 
                number="03"
                title="Sertifikat"
                desc="QR-kodli va rasmiy tasdiqlangan sertifikatni lahzada qo'lga kiriting."
                icon={GraduationCap}
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-32 bg-blue-600">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid gap-16 md:grid-cols-3 text-center">
              {[
                { label: "Muvaffaqiyatli testlar", value: "50,000+" },
                { label: "Aniq daraja aniqlash", value: "99.8%" },
                { label: "Xalqaro hamkorlar", value: "120+" },
              ].map((s) => (
                <motion.div key={s.label} initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}>
                  <p className="text-6xl font-black text-white mb-2">{s.value}</p>
                  <p className="text-lg font-bold text-blue-100 uppercase tracking-widest">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-48 px-6">
          <div className="container mx-auto max-w-3xl">
            <motion.h2 initial="initial" whileInView="whileInView" variants={fadeUp} className="text-4xl font-black text-center mb-16">Ko'p so'raladigan savollar</motion.h2>
            <div className="space-y-6">
              <FaqItem 
                q="Sertifikatlar qayerda amal qiladi?" 
                a="Bizning sertifikatlarimiz xalqaro standartlarga javob beradi va ko'plab oliygohlar hamda tashkilotlar tomonidan tan olinadi."
              />
              <FaqItem 
                q="AI qanchalik aniq baholaydi?" 
                a="Bizning AI modellarimiz real IELTS ekspertlari bilan 98% muvofiqlikda ishlaydi."
              />
              <FaqItem 
                q="Test qancha vaqt davom etadi?" 
                a="Adaptiv tizim tufayli test 30-45 daqiqa davom etadi, bu an'anaviy testlardan 2 barobar tezroq."
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
              <h2 className="relative z-10 text-5xl font-black text-white sm:text-8xl">Bilimingizni <br /> hoziroq sinab ko'ring</h2>
              <p className="relative z-10 mt-8 text-xl text-blue-100 max-w-2xl mx-auto">Hech qanday kutishlarsiz, lahzalik natija va professional tahlilga ega bo'ling.</p>
              <div className="relative z-10 mt-12 flex justify-center">
                <a href="http://app.localhost/login" className="rounded-full bg-white px-12 py-5 text-xl font-black text-blue-600 hover:scale-105 transition-transform shadow-xl">
                  Bepul boshlash
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
      className={`group relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-10 transition-all duration-700 hover:border-blue-500/50 hover:shadow-2xl ${className}`}
    >
      {image && (
        <div className="absolute inset-0 z-0">
          <img src={image} className="h-full w-full object-cover opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-40" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}
      
      <div className="relative z-10 h-full flex flex-col justify-end">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 text-blue-400 border border-white/10 shadow-2xl group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
          <Icon className="size-8" />
        </div>
        <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">{title}</h3>
        <p className="text-lg text-slate-400 group-hover:text-slate-200 transition-colors line-clamp-2">
          {desc}
        </p>
      </div>
    </motion.a>
  );
}

function StepItem({ number, title, desc, icon: Icon }: { number: string; title: string; desc: string; icon: any }) {
  return (
    <motion.div initial="initial" whileInView="whileInView" variants={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } }} className="relative z-10 flex flex-col items-center text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 border-4 border-blue-500/20 text-blue-400 shadow-2xl transition-transform hover:scale-110">
        <Icon className="size-10" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">{number} Step</span>
      <h3 className="text-2xl font-black text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed max-w-xs">{desc}</p>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between p-6 text-left hover:bg-white/5 transition-colors">
        <span className="text-lg font-bold text-white">{q}</span>
        <ArrowRight className={`size-5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
      {isOpen && (
        <div className="p-6 pt-0 text-slate-400 leading-relaxed animate-in slide-in-from-top-2">
          {a}
        </div>
      )}
    </div>
  );
}

