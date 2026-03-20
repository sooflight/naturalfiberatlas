/**
 * about.tsx — About page for the Natural Fiber Atlas.
 */

import { Link } from "react-router";
import { useAdminMode, useAtlasData } from "../context/atlas-data-context";
import { ArrowLeft, Leaf, Globe, BookOpen, FlaskConical } from "lucide-react";
import { ATLAS_PILL_BASE_CLASS, ATLAS_PILL_IDLE_CLASS, NAV_FONT_STYLE } from "../components/atlas-shared";
import { useEffect, useRef, useState } from "react";

function useOnScreen(ref: React.RefObject<HTMLElement | null>, rootMargin = "0px") {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin, threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return visible;
}

const featureCards = [
  {
    icon: Leaf,
    title: "Sustainability Metrics",
    desc: "Five-axis environmental scoring: water usage, carbon footprint, chemical processing, circularity, and overall environmental rating.",
    accentColor: "rgba(74, 222, 128, 0.12)",
    borderColor: "rgba(74, 222, 128, 0.15)",
    iconColor: "text-green-400/60",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    desc: "Fiber profiles spanning every continent, from ancient heritage fibers to emerging bio-based innovations.",
    accentColor: "rgba(96, 165, 250, 0.10)",
    borderColor: "rgba(96, 165, 250, 0.12)",
    iconColor: "text-blue-400/60",
  },
  {
    icon: BookOpen,
    title: "Deep Profiles",
    desc: "Each entry includes process diagrams, anatomical cross-sections, care instructions, cultural quotes, and worldwide nomenclature.",
    accentColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.12)",
    iconColor: "text-amber-400/60",
  },
  {
    icon: FlaskConical,
    title: "Material Science",
    desc: "Technical data on fiber structure, processing methods, and performance characteristics for designers and researchers.",
    accentColor: "rgba(192, 132, 252, 0.08)",
    borderColor: "rgba(192, 132, 252, 0.12)",
    iconColor: "text-purple-400/60",
  },
] as const;

function FeatureCard({
  card,
  index,
}: {
  card: (typeof featureCards)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref, "0px 0px -40px 0px");

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border space-y-3 transition-all duration-700 ease-out"
      style={{
        padding: "clamp(16px, 3vw, 24px)",
        background: visible ? card.accentColor : "rgba(255,255,255,0.02)",
        borderColor: visible ? card.borderColor : "rgba(255,255,255,0.06)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle, ${card.accentColor} 0%, transparent 70%)`,
          filter: "blur(30px)",
          opacity: visible ? 0.7 : 0,
          transition: "opacity 1s ease",
          transitionDelay: `${index * 100 + 200}ms`,
        }}
      />
      <card.icon size={20} className={card.iconColor} />
      <h3
        className="text-white/80 tracking-[0.06em]"
        style={{ fontSize: "13px", fontWeight: 600 }}
      >
        {card.title}
      </h3>
      <p className="text-white/35" style={{ fontSize: "12px", lineHeight: 1.65 }}>
        {card.desc}
      </p>
    </div>
  );
}

export function AboutPage() {
  const { adminMode } = useAdminMode();
  const { fiberIndex } = useAtlasData();
  const profileCount = fiberIndex.filter((f) => f.category !== "navigation-parent").length;

  const heroRef = useRef<HTMLDivElement>(null);
  const heroVisible = useOnScreen(heroRef, "0px");

  return (
    <div
      className="min-h-dvh bg-[#111111] text-white relative overflow-hidden"
      style={{
        transition: "margin-right 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        marginRight: adminMode ? "min(400px, 90vw)" : 0,
      }}
    >
      {/* Ambient mesh gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(74,222,128,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 80% 60%, rgba(96,165,250,0.03) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 90%, rgba(192,132,252,0.03) 0%, transparent 60%)
          `,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/[0.06] bg-[#111111]/80">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1 ${ATLAS_PILL_BASE_CLASS} ${ATLAS_PILL_IDLE_CLASS}`}
            style={{ ...NAV_FONT_STYLE, fontSize: "10px" }}
          >
            <ArrowLeft size={14} />
            <span style={{ fontWeight: 500 }}>
              Atlas
            </span>
          </Link>
          <div className="w-px h-4 bg-white/[0.08]" />
          <h1
            className="text-white/70 tracking-[0.08em] uppercase"
            style={{ fontSize: "clamp(12px, 2vw, 15px)", fontWeight: 400 }}
          >
            About
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-12 space-y-16">
        {/* Hero */}
        <section ref={heroRef} className="space-y-5">
          <h2
            className="text-white/90 tracking-[0.04em] transition-all duration-700 ease-out"
            style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 300,
              lineHeight: 1.25,
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            The Natural Fiber Atlas
          </h2>
          <p
            className="text-white/40 transition-all duration-700 ease-out"
            style={{
              fontSize: "clamp(13px, 2vw, 15px)",
              lineHeight: 1.7,
              maxWidth: "55ch",
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "120ms",
            }}
          >
            A comprehensive visual reference cataloguing the world's natural fibers,
            textiles, and dyes. Each profile documents origin, processing, sustainability
            metrics, and cultural significance — bridging traditional craft knowledge
            with modern material science.
          </p>

          {/* Live stat */}
          <div
            className="flex items-center gap-3 transition-all duration-700 ease-out"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(10px)",
              transitionDelay: "240ms",
            }}
          >
            <span
              className="tabular-nums text-white/80"
              style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 300 }}
            >
              {profileCount}
            </span>
            <span
              className="text-white/30 uppercase tracking-[0.15em]"
              style={{ fontSize: "10px", fontWeight: 600 }}
            >
              Profiles catalogued
            </span>
          </div>
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featureCards.map((card, i) => (
            <FeatureCard key={card.title} card={card} index={i} />
          ))}
        </section>

        {/* Data architecture */}
        <section className="space-y-4">
          <h3
            className="text-white/50 tracking-[0.12em] uppercase"
            style={{ fontSize: "10px", fontWeight: 600 }}
          >
            Data Architecture
          </h3>
          <div
            className="relative overflow-hidden p-5 rounded-xl border border-white/[0.06] space-y-3"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)",
                filter: "blur(25px)",
              }}
            />
            <p className="text-white/35 relative" style={{ fontSize: "12px", lineHeight: 1.7 }}>
              The Atlas uses a layered data provider pattern. Bundled profile data
              serves as the read-only base layer. An extensible override system
              writes changes to localStorage, which merge on top of bundled
              defaults at read time. The <code className="text-amber-400/50">AtlasDataSource</code> interface
              is designed so a GitHub Gist or Blob storage backend can be swapped
              in with a single line change.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] pt-8 pb-16 flex items-center justify-between">
          <span className="text-white/15" style={{ fontSize: "10px", letterSpacing: "0.12em" }}>
            NATURAL FIBER ATLAS
          </span>
          <Link
            to="/"
            className="text-white/25 hover:text-white/50 transition-colors"
            style={{ fontSize: "11px" }}
          >
            Back to Atlas
          </Link>
        </footer>
      </main>
    </div>
  );
}
