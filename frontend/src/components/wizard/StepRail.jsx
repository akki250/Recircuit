import { Check } from "lucide-react";
import { STEPS } from "../../lib/content";

export default function StepRail({ step }) {
  return (
    <ol className="grid grid-cols-3 md:grid-cols-6 gap-2" data-testid="step-rail">
      {STEPS.map((s) => {
        const Icon = s.icon;
        const done = s.n < step; const active = s.n === step; const later = s.n > 3;
        return (
          <li key={s.n} className={`rounded-2xl border px-3 py-3 flex items-center gap-3 transition-colors duration-300 ${active ? "bg-acid text-black border-acid" : done ? "bg-acid/10 border-acid/40 text-white" : later ? "bg-transparent border-dashed border-white/10 text-white/30" : "bg-coal border-white/10 text-white/60"}`} data-testid={`step-rail-${s.n}`}>
            <span className={`grid place-items-center w-8 h-8 rounded-full shrink-0 ${active ? "bg-black/10" : done ? "bg-acid text-black" : "bg-white/5"}`}>{done ? <Check size={14} /> : <Icon size={14} />}</span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Step {s.n}</div>
              <div className="text-sm font-semibold truncate">{s.title}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
