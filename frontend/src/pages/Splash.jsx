import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Recycle } from "lucide-react";
import CountUp from "../components/CountUp";
import { api } from "../lib/api";
import { META } from "../lib/content";

const FALLBACK = { total_kg: 0, collectors: 0, rupees_paid: 0 };

export default function Splash() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    document.title = "ReCircuit — The Null Set";
    api.get("/stats").then((r) => setStats(r.data)).catch(() => setStats(FALLBACK));
    const t = setTimeout(() => nav("/home"), 5200);
    return () => clearTimeout(t);
  }, [nav]);

  const s = stats || FALLBACK;
  const items = [
    { label: "kg e-waste recycled", value: s.total_kg, prefix: "" },
    { label: "active collectors", value: s.collectors, prefix: "" },
    { label: "paid out to collectors", value: s.rupees_paid, prefix: "₹" },
  ];

  return (
    <div className="relative min-h-screen bg-ink text-white overflow-hidden halftone noise" data-testid="splash-page">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-acid/10 blur-[140px] pointer-events-none" />
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-16 pt-8">
        <div className="flex items-center gap-3 fade-up">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-acid text-black"><Recycle size={20} /></span>
          <span className="font-display font-bold text-lg tracking-tight">ReCircuit</span>
        </div>
        <button onClick={() => nav("/home")} className="btn-ghost fade-up" data-testid="splash-skip-button">
          Skip intro <ArrowRight size={16} />
        </button>
      </header>

      <main className="relative z-10 px-8 lg:px-16 pt-16 lg:pt-24 max-w-6xl">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 fade-up" style={{ animationDelay: "0.1s" }} data-testid="splash-meta">
          {[["PS ID", META.psId], ["Theme", META.theme], ["Team", META.team], ["Track", "Hackathon MVP"]].map(([k, v]) => (
            <div key={k} className="border-l border-white/10 pl-4">
              <dt className="label">{k}</dt>
              <dd className="mt-1 text-sm font-medium text-white/90">{v}</dd>
            </div>
          ))}
        </dl>

        <h1 className="mt-14 font-display font-black leading-[0.95] text-4xl sm:text-5xl lg:text-7xl max-w-5xl fade-up" style={{ animationDelay: "0.25s" }} data-testid="splash-title">
          Digitalizing the <span className="text-acid">Informal</span> E-Waste Recycling System
        </h1>
        <p className="mt-6 text-base md:text-lg text-white/60 max-w-2xl fade-up" style={{ animationDelay: "0.4s" }}>
          Capture · Categorize · Value · Match · Handover · Payment — six steps that turn scrap on the pavement into a verified, paid transaction.
        </p>

        {stats && (
          <div className="mt-14 grid sm:grid-cols-3 gap-4 fade-up" style={{ animationDelay: "0.55s" }} data-testid="splash-stats">
            {items.map((it, i) => (
              <div key={it.label} className="glass rounded-3xl p-6 lg:p-8">
                <div className="font-display font-bold text-4xl lg:text-5xl text-white tabular-nums">
                  {it.prefix}<CountUp to={Math.round(it.value)} separator="," duration={1.6} delay={0.2 + i * 0.15} className="count-up-text" />
                </div>
                <div className="mt-2 text-sm text-white/50">{it.label}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="absolute bottom-0 inset-x-0 z-10">
        <div className="flex items-center justify-between px-8 lg:px-16 pb-5 text-xs text-white/40 uppercase tracking-[0.2em]">
          <span>Loading marketplace</span>
          <span>The Null Set · 2026</span>
        </div>
        <div className="h-1 bg-white/5"><div className="h-full bg-acid splash-bar" data-testid="splash-progress" /></div>
      </footer>
    </div>
  );
}
