import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ScanEye } from "lucide-react";
import { api, errMsg } from "../../lib/api";

export default function StepCategorize({ form, update }) {
  const [cats, setCats] = useState([]);
  const [conds, setConds] = useState([]);
  const [result, setResult] = useState(null);
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => { api.get("/categories").then((r) => { setCats(r.data.categories); setConds(r.data.conditions); }); }, []);

  const auto = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/categorize", { text: `${form.title} ${form.description}`.trim() });
      setResult(data); update({ category: data.category });
      toast.success(`Classified as ${data.label} (${Math.round(data.confidence * 100)}% confidence)`);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const aiAnalyze = async () => {
    setAiBusy(true);
    try {
      const { data } = await api.post("/categorize/photo", { photo_path: form.photo_path, hint: `${form.title} ${form.description}`.trim() });
      setAi(data); update({ category: data.category, weight_kg: String(data.weight_kg), condition: data.condition });
      toast.success(`AI: ${data.label} · ~${data.weight_kg} kg · ${data.condition}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-6" data-testid="step-categorize">
      <div><span className="eyebrow">Step 2 · Categorize</span><h2 className="mt-2 font-display font-bold text-2xl">Type & weight</h2></div>
      <div className="rounded-2xl border border-acid/30 bg-acid/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="ai-panel">
        <div className="flex-1">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><ScanEye size={16} className="text-acid" /> AI photo analysis</div>
          <div className="text-xs text-white/50 mt-0.5">{form.photo_path ? "GPT-5.4 Mini reads your photo and fills category, weight and condition." : "Upload a photo in Step 1 to enable AI analysis."}</div>
        </div>
        <button type="button" onClick={aiAnalyze} disabled={aiBusy || !form.photo_path} className="btn-primary !py-2" data-testid="ai-analyze-button"><Sparkles size={16} /> {aiBusy ? "Analyzing…" : "Analyze photo"}</button>
      </div>
      {ai && (
        <div className="rounded-2xl bg-ink border border-white/10 p-4 text-sm space-y-2" data-testid="ai-result">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{ai.label}</span><span className="text-white/40">·</span><span>~{ai.weight_kg} kg</span><span className="text-white/40">·</span><span className="capitalize">{ai.condition}</span><span className="ml-auto text-xs text-acid">{Math.round(ai.confidence * 100)}% confidence</span></div>
          {ai.items?.length > 0 && <div className="flex flex-wrap gap-1.5">{ai.items.map((it, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-white/70">{it}</span>)}</div>}
          {ai.notes && <p className="text-xs text-white/50">{ai.notes}</p>}
        </div>
      )}
      <div>
        <label className="label mb-2" htmlFor="desc">Or describe the items</label>
        <textarea id="desc" rows={3} className="field resize-none" value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="e.g. Two Dell laptops, one cracked LCD monitor, a bundle of copper wires…" data-testid="listing-description-input" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={auto} disabled={busy || (form.title + form.description).trim().length < 2} className="btn-white !py-2" data-testid="auto-categorize-button"><Sparkles size={16} /> {busy ? "Classifying…" : "Auto-categorize (text)"}</button>
          {result && <span className="text-xs text-white/60" data-testid="categorize-result">Rule engine matched <span className="text-acid">{result.matched.join(", ") || "no keywords"}</span> → {result.label} · ₹{result.per_kg}/kg</span>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label mb-2" htmlFor="category">Category</label>
          <select id="category" className="field" value={form.category} onChange={(e) => update({ category: e.target.value })} data-testid="category-select">
            <option value="">Select…</option>
            {cats.map((c) => <option key={c.key} value={c.key}>{c.label} · ₹{c.per_kg}/kg</option>)}
          </select></div>
        <div><label className="label mb-2" htmlFor="weight">Weight (kg)</label>
          <input id="weight" type="number" min="0.1" step="0.1" className="field" value={form.weight_kg} onChange={(e) => update({ weight_kg: e.target.value })} placeholder="e.g. 12.5" data-testid="weight-input" /></div>
      </div>
      <div>
        <div className="label mb-2">Condition</div>
        <div className="grid grid-cols-3 gap-2" data-testid="condition-selector">
          {conds.map((c) => (
            <button key={c.key} type="button" onClick={() => update({ condition: c.key })} data-testid={`condition-${c.key}-button`}
              className={`rounded-xl border px-3 py-2.5 text-sm capitalize transition-colors duration-200 ${form.condition === c.key ? "bg-acid text-black border-acid" : "bg-ink border-white/10 text-white/70 hover:bg-white/5"}`}>
              {c.key} <span className="opacity-60 text-xs">×{c.multiplier}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
