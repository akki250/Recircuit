import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { PageHeader } from "../../components/KpiCard";
import StepRail from "../../components/wizard/StepRail";
import StepCapture from "../../components/wizard/StepCapture";
import StepCategorize from "../../components/wizard/StepCategorize";
import StepValue from "../../components/wizard/StepValue";
import { api, errMsg } from "../../lib/api";

const INITIAL = { title: "", location: "", lat: null, lng: null, description: "", photo_path: null, preview: null, category: "", weight_kg: "", condition: "repairable" };

export default function NewListing() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [estimate, setEstimate] = useState(null);
  const [busy, setBusy] = useState(false);
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (step !== 3 || !form.category || !form.weight_kg) return;
    api.post("/estimate", { category: form.category, weight_kg: +form.weight_kg, condition: form.condition })
      .then((r) => setEstimate(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [step, form.category, form.weight_kg, form.condition]);

  const canNext = step === 1 ? form.title.trim().length >= 2 : step === 2 ? form.category && +form.weight_kg > 0 : true;

  const publish = async () => {
    setBusy(true);
    try {
      await api.post("/listings", { title: form.title, description: form.description, location: form.location, lat: form.lat, lng: form.lng, category: form.category, weight_kg: +form.weight_kg, condition: form.condition, photo_path: form.photo_path });
      toast.success("Listing published — recyclers can now match it");
      nav("/app");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8" data-testid="new-listing-page">
      <PageHeader eyebrow="New listing" title="Capture → Categorize → Value" sub="Steps 4–6 (Match, Handover, Payment) happen automatically once a recycler picks your lot." />
      <StepRail step={step} />
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="bento-static p-6 lg:p-8">
          {step === 1 && <StepCapture form={form} update={update} />}
          {step === 2 && <StepCategorize form={form} update={update} />}
          {step === 3 && <StepValue estimate={estimate} />}
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
            <button type="button" disabled={step === 1} onClick={() => setStep(step - 1)} className="btn-secondary" data-testid="wizard-back-button"><ArrowLeft size={16} /> Back</button>
            {step < 3 ? (
              <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-primary" data-testid="wizard-next-button">Next <ArrowRight size={16} /></button>
            ) : (
              <button type="button" disabled={busy || !estimate} onClick={publish} className="btn-primary" data-testid="wizard-publish-button"><Send size={16} /> {busy ? "Publishing…" : "Publish listing"}</button>
            )}
          </div>
        </div>
        <aside className="glass-light rounded-3xl p-6 space-y-4 self-start" data-testid="wizard-summary">
          <div className="label">Summary</div>
          {form.preview && <img src={form.preview} alt="preview" className="w-full h-36 object-cover rounded-2xl" />}
          {[["Title", form.title || "—"], ["Location", form.location || "—"], ["Pin", form.lat != null ? `${form.lat.toFixed(3)}, ${form.lng.toFixed(3)}` : "—"], ["Category", form.category || "—"], ["Weight", form.weight_kg ? `${form.weight_kg} kg` : "—"], ["Condition", form.condition]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-sm"><span className="text-white/50">{k}</span><span className="text-right truncate">{v}</span></div>
          ))}
        </aside>
      </div>
    </div>
  );
}
