import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CountUp from "../CountUp";
import { api } from "../../lib/api";

export default function Impact() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/stats").then((r) => setS(r.data)).catch(() => setS({})); }, []);
  const stats = [
    ["₹", s?.rupees_paid || 0, "paid out to collectors"],
    ["", s?.total_kg || 0, "kg diverted from landfill"],
    ["", s?.lots_completed || 0, "lots settled with a digital record"],
  ];
  return (
    <section id="impact" className="max-w-7xl mx-auto px-6 lg:px-12 py-24" data-testid="impact-section">
      <div className="bento-static noise overflow-hidden p-8 lg:p-14 grid lg:grid-cols-12 gap-10 items-center">
        <div className="absolute -left-20 -bottom-40 w-[500px] h-[500px] rounded-full bg-acid/10 blur-[140px] pointer-events-none" />
        <div className="relative lg:col-span-5">
          <span className="eyebrow">Impact so far</span>
          <h2 className="mt-3 font-display font-bold text-2xl sm:text-3xl lg:text-4xl">Live numbers, straight from the database.</h2>
          <p className="mt-4 text-sm md:text-base text-white/50">Every figure updates the moment a recycler's Stripe payment clears. No vanity metrics.</p>
          <Link to="/register" className="btn-primary mt-8" data-testid="impact-cta">Join the network <ArrowRight size={16} /></Link>
        </div>
        <div className="relative lg:col-span-7 grid sm:grid-cols-3 gap-4">
          {s && stats.map(([pre, v, l]) => (
            <div key={l} className="glass rounded-3xl p-6">
              <div className="font-display font-bold text-3xl lg:text-4xl tabular-nums">{pre}<CountUp to={Math.round(v)} separator="," duration={1.5} /></div>
              <div className="mt-2 text-xs text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
