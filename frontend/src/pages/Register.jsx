import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { HardHat, Factory } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../lib/api";

const ROLES = [
  { key: "collector", label: "Collector", hint: "I collect & sell e-waste", icon: HardHat },
  { key: "recycler", label: "Recycler", hint: "I buy & process e-waste", icon: Factory },
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: params.get("role") === "recycler" ? "recycler" : "collector" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await register(form);
      toast.success(`Account created — welcome, ${u.name}`);
      nav("/app");
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create account" subtitle="Pick your role. Admins are provisioned separately."
      footer={<>Already registered? <Link to="/login" className="text-acid hover:underline" data-testid="register-login-link">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        <div className="grid grid-cols-2 gap-3" data-testid="role-selector">
          {ROLES.map((r) => {
            const Icon = r.icon; const active = form.role === r.key;
            return (
              <button key={r.key} type="button" onClick={() => setForm({ ...form, role: r.key })} data-testid={`role-${r.key}-button`}
                className={`text-left rounded-2xl border p-4 transition-colors duration-200 ${active ? "bg-acid text-black border-acid" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                <Icon size={20} />
                <div className="mt-3 font-semibold text-sm">{r.label}</div>
                <div className={`text-xs mt-0.5 ${active ? "text-black/60" : "text-white/50"}`}>{r.hint}</div>
              </button>
            );
          })}
        </div>
        <div><label className="label mb-2" htmlFor="name">Full name</label>
          <input id="name" required minLength={2} className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ravi Kumar" data-testid="register-name-input" /></div>
        <div><label className="label mb-2" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="register-email-input" /></div>
        <div><label className="label mb-2" htmlFor="phone">Mobile (for SMS / WhatsApp alerts)</label>
          <input id="phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210 (optional)" data-testid="register-phone-input" /></div>
        <div><label className="label mb-2" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" data-testid="register-password-input" /></div>
        {error && <p className="text-sm text-red-400" data-testid="register-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="register-submit-button">{busy ? "Creating…" : `Join as ${form.role}`}</button>
      </form>
    </AuthShell>
  );
}
