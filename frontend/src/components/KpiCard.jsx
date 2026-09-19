import { TrendingUp } from "lucide-react";

export default function KpiCard({ title, value, hint, trend, icon: Icon, accent = false, testId }) {
  return (
    <div className={`bento-static p-6 h-full ${accent ? "!bg-acid !text-black" : "!bg-ash"}`} data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className={`text-xs uppercase tracking-[0.2em] ${accent ? "text-black/60" : "text-white/50"}`}>{title}</div>
        {Icon && <Icon size={18} className={accent ? "text-black/60" : "text-white/40"} />}
      </div>
      <div className="mt-4 font-display font-bold text-3xl tabular-nums">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && <span className={`inline-flex items-center gap-1 font-medium ${accent ? "text-black" : "text-acid"}`}><TrendingUp size={14} />{trend}</span>}
        {hint && <span className={accent ? "text-black/60" : "text-white/50"}>{hint}</span>}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-2 font-display font-bold text-3xl lg:text-4xl" data-testid="page-title">{title}</h1>
        {sub && <p className="mt-2 text-sm text-white/50">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
