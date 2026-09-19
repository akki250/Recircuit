import { Link } from "react-router-dom";
import { Recycle } from "lucide-react";
import { IMAGES, META } from "../lib/content";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink text-white grid lg:grid-cols-2" data-testid="auth-shell">
      <div className="relative hidden lg:block overflow-hidden">
        <img src={IMAGES.circuit} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/60 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <Link to="/home" className="flex items-center gap-3" data-testid="auth-logo-link">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-acid text-black"><Recycle size={20} /></span>
            <span className="font-display font-bold text-lg">ReCircuit</span>
          </Link>
          <div>
            <span className="eyebrow">{META.psId} · {META.theme}</span>
            <h2 className="mt-4 font-display font-black text-3xl lg:text-4xl max-w-md leading-tight">{META.title}</h2>
            <p className="mt-4 text-white/50 text-sm">Team {META.team}</p>
          </div>
        </div>
      </div>
      <div className="relative flex items-center justify-center p-6 lg:p-12 halftone">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-acid/10 blur-[120px] pointer-events-none" />
        <div className="relative w-full max-w-md glass rounded-3xl p-8 lg:p-10 fade-up">
          <h1 className="font-display font-bold text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-white/50">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-white/50">{footer}</div>
        </div>
      </div>
    </div>
  );
}
