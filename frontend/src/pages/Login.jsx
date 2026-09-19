import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../lib/api";

const DEMOS = [["Collector", "collector@nullset.dev", "Collector@123"], ["Recycler", "recycler@nullset.dev", "Recycler@123"]];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name}`);
      nav("/app");
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Sign in" subtitle="Collector, recycler or admin — one login, role-aware dashboard."
      footer={<>New here? <Link to="/register" className="text-acid hover:underline" data-testid="login-register-link">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div><label className="label mb-2" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" data-testid="login-email-input" /></div>
        <div><label className="label mb-2" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" data-testid="login-password-input" /></div>
        {error && <p className="text-sm text-red-400" data-testid="login-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="login-submit-button">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="mt-6">
        <div className="label mb-2">Demo accounts</div>
        <div className="flex flex-wrap gap-2">
          {DEMOS.map(([r, em, pw]) => (
            <button key={r} type="button" onClick={() => setForm({ email: em, password: pw })} className="btn-secondary !py-1.5 !px-3 text-xs" data-testid={`demo-${r.toLowerCase()}-button`}>{r}</button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
