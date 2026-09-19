import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, MessageSquare, Smartphone } from "lucide-react";
import { PageHeader } from "../components/KpiCard";
import { useAuth } from "../context/AuthContext";
import { api, errMsg } from "../lib/api";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "", alert_channel: user.alert_channel || "sms" });
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/alerts/config").then((r) => setCfg(r.data)).catch(() => setCfg({})); }, []);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.put("/me/profile", form); await refreshUser(); toast.success("Profile saved"); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8 max-w-2xl" data-testid="profile-page">
      <PageHeader eyebrow="Account" title="Profile & alerts" sub="Where should we reach you when a recycler matches or pays for your lot?" />
      <form onSubmit={save} className="bento-static p-6 lg:p-8 space-y-6">
        <div><label className="label mb-2" htmlFor="pname">Full name</label>
          <input id="pname" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" /></div>
        <div><label className="label mb-2" htmlFor="pphone">Mobile number</label>
          <input id="pphone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" data-testid="profile-phone-input" />
          <p className="mt-1.5 text-xs text-white/40">International format. 10-digit Indian numbers get +91 automatically.</p></div>
        <div>
          <div className="label mb-2">Alert channel</div>
          <div className="grid grid-cols-2 gap-3" data-testid="alert-channel-selector">
            {[["sms", "SMS", Smartphone], ["whatsapp", "WhatsApp", MessageSquare]].map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => setForm({ ...form, alert_channel: key })} data-testid={`alert-channel-${key}-button`}
                className={`rounded-2xl border p-4 text-left transition-colors duration-200 ${form.alert_channel === key ? "bg-acid text-black border-acid" : "bg-ink border-white/10 hover:bg-white/5"}`}>
                <Icon size={18} /><div className="mt-2 font-semibold text-sm">{label}</div>
              </button>
            ))}
          </div>
          {cfg && !cfg.sms_enabled && <p className="mt-3 text-xs text-amber-300/80" data-testid="twilio-not-configured">Twilio keys not added yet — alerts appear in the bell menu now and will also go out by {form.alert_channel === "whatsapp" ? "WhatsApp" : "SMS"} once TWILIO_* keys are set in backend/.env.</p>}
        </div>
        <button type="submit" disabled={busy} className="btn-primary" data-testid="profile-save-button"><Save size={16} /> {busy ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}
