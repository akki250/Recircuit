import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, ShieldCheck } from "lucide-react";
import { IMAGES } from "../../lib/content";

const facts = [["11", "e-waste classes"], ["₹55–900", "per kg price table"], ["3", "roles · collector, recycler, admin"], ["1 tap", "Stripe payout"]];

export default function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-16 overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0 halftone opacity-60 pointer-events-none" />
      <div className="absolute -top-32 -right-40 w-[700px] h-[700px] rounded-full bg-acid/10 blur-[160px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="lg:col-span-7">
          <span className="eyebrow"><span className="w-1.5 h-1.5 rounded-full bg-acid" /> Open Innovation · Clean & Technology</span>
          <h1 className="mt-6 font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[0.95] max-w-3xl">
            Turn informal e-waste into <span className="text-acid">verified income.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/60 max-w-xl leading-relaxed">
            ReCircuit gives kabadiwalas and scrap collectors a fair price table, a recycler marketplace and instant Stripe payouts — with a digital record for every kilogram.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register?role=collector" className="btn-primary" data-testid="hero-collector-cta">Start collecting <ArrowRight size={16} /></Link>
            <Link to="/register?role=recycler" className="btn-secondary" data-testid="hero-recycler-cta">I'm a recycler</Link>
          </div>
          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-8">
            {facts.map(([v, l]) => (
              <div key={l}><dt className="font-display font-bold text-2xl text-white">{v}</dt><dd className="text-xs text-white/50 mt-1">{l}</dd></div>
            ))}
          </dl>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 lime-glow aspect-[4/5]">
            <img src={IMAGES.circuit} alt="Circuit board macro" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute left-5 right-5 bottom-5 space-y-3">
              <div className="glass rounded-2xl p-4 flex items-center justify-between">
                <div><div className="label">Live rate · PCB</div><div className="font-display font-bold text-2xl mt-1">₹900<span className="text-sm text-white/50 font-body">/kg</span></div></div>
                <span className="inline-flex items-center gap-1 text-acid text-sm font-medium"><TrendingUp size={16} /> +12.5%</span>
              </div>
              <div className="glass rounded-2xl p-4 flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-full bg-acid text-black"><ShieldCheck size={18} /></span>
                <div><div className="text-sm font-medium">Handover EW-3F9A21 recorded</div><div className="text-xs text-white/50">Ambattur → GreenLoop Recyclers · ₹4,275 credited</div></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
