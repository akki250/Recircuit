import { motion } from "framer-motion";
import { ARCH } from "../../lib/content";

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function ArchGrid() {
  return (
    <section id="architecture" className="border-y border-white/10 bg-coal/40" data-testid="architecture-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <span className="eyebrow">Core architecture & languages</span>
        <h2 className="mt-3 font-display font-bold text-2xl sm:text-3xl lg:text-4xl max-w-2xl">The PPT stack, mapped to what actually ships in this MVP.</h2>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} transition={{ staggerChildren: 0.06 }}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCH.map((a) => {
            const Icon = a.icon;
            return (
              <motion.div key={a.title} variants={item} className="bento p-7 flex gap-5" data-testid={`arch-card-${a.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <span className="grid place-items-center shrink-0 w-12 h-12 rounded-2xl bg-acid/10 text-acid"><Icon size={22} /></span>
                <div>
                  <h3 className="font-display font-bold text-lg">{a.title}</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex gap-2"><span className="label w-14 shrink-0 pt-0.5">Spec</span><span className="text-white/50">{a.spec}</span></div>
                    <div className="flex gap-2"><span className="label w-14 shrink-0 pt-0.5">Built</span><span className="text-white">{a.built}</span></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
