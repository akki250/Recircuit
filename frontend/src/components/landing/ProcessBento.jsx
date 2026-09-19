import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import CountUp from "../CountUp";
import { STEPS, IMAGES } from "../../lib/content";

const VARIANTS = [
  "lg:col-span-5 lg:row-span-2 bg-coal text-white",
  "lg:col-span-4 bg-acid text-black halftone-acid",
  "lg:col-span-3 bg-[#F3F4F6] text-black",
  "lg:col-span-3 bg-forest text-white",
  "lg:col-span-4 glass-light text-white",
  "lg:col-span-12 bg-ash text-white",
];

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] } } };

export default function ProcessBento() {
  return (
    <section id="process" className="max-w-7xl mx-auto px-6 lg:px-12 py-24" data-testid="process-section">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-display font-bold text-2xl sm:text-3xl lg:text-4xl max-w-xl">Six steps from pavement to payout.</h2>
        </div>
        <p className="text-sm md:text-base text-white/50 max-w-md">Every card below is a live feature in the app — not a roadmap. The same six-step flow powers collector, recycler and admin views.</p>
      </div>

      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} transition={{ staggerChildren: 0.08 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:auto-rows-[minmax(220px,auto)]">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const dark = i === 1 || i === 2;
          return (
            <motion.article key={s.n} variants={item} className={`bento overflow-hidden p-7 lg:p-8 flex flex-col ${VARIANTS[i]}`} data-testid={`step-card-${s.n}`}>
              <div className="flex items-start justify-between">
                <span className={`grid place-items-center w-12 h-12 rounded-2xl ${dark ? "bg-black/10 text-black" : "bg-white/10 text-white"}`}><Icon size={22} /></span>
                <span className={`font-display font-black text-5xl leading-none ${dark ? "text-black/15" : "text-white/10"}`}>0{s.n}</span>
              </div>
              <div className="mt-auto pt-8">
                <div className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-black/60" : "text-white/50"}`}>{s.sub}</div>
                <h3 className="mt-1 font-display font-bold text-xl sm:text-2xl">{s.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-black/70" : "text-white/60"} ${i === 5 ? "max-w-xl" : ""}`}>{s.desc}</p>
                <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${dark ? "text-black" : "text-acid"}`}>{s.tech} <ArrowUpRight size={14} /></div>
              </div>
              {i === 0 && (
                <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none">
                  <img src={IMAGES.circuit} alt="" className="w-full h-full object-cover opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/80 to-transparent" />
                </div>
              )}
              {i === 5 && (
                <div className="absolute right-8 top-8 hidden lg:block glass rounded-2xl p-5 w-64">
                  <div className="label">Wallet balance</div>
                  <div className="mt-1 font-display font-bold text-3xl text-acid">₹<CountUp to={18420} separator="," duration={1.8} /></div>
                  <div className="mt-2 text-xs text-white/50">+₹4,275 · GreenLoop Recyclers · just now</div>
                </div>
              )}
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
