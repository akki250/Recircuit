import CountUp from "../CountUp";

export default function StepValue({ estimate }) {
  if (!estimate) return <div className="text-white/50 text-sm" data-testid="step-value-loading">Calculating estimate…</div>;
  return (
    <div className="space-y-6" data-testid="step-value">
      <div><span className="eyebrow">Step 3 · Value</span><h2 className="mt-2 font-display font-bold text-2xl">Price estimate</h2></div>
      <div className="bento-static !bg-acid !text-black halftone-acid p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-black/60">Guaranteed listing price</div>
        <div className="mt-2 font-display font-black text-5xl lg:text-6xl tabular-nums" data-testid="estimate-price">₹<CountUp to={Math.round(estimate.estimated_price)} separator="," duration={1.2} /></div>
        <div className="mt-3 text-sm text-black/70">{estimate.label} · {estimate.weight_kg} kg · {estimate.condition}</div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {[["Rate", `₹${estimate.price_per_kg}/kg`], ["Weight", `${estimate.weight_kg} kg`], ["Condition multiplier", `×${estimate.multiplier}`]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-ink border border-white/10 p-4"><div className="label">{k}</div><div className="mt-1 font-semibold" data-testid={`estimate-${k.toLowerCase().replace(/\s+/g, "-")}`}>{v}</div></div>
        ))}
      </div>
      <p className="text-xs text-white/40">Rule-based pricing v1: ₹/kg table × condition multiplier. This is what the recycler pays through Stripe and what lands in your wallet.</p>
    </div>
  );
}
