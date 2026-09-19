import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import ProcessBento from "../components/landing/ProcessBento";
import ArchGrid from "../components/landing/ArchGrid";
import Impact from "../components/landing/Impact";
import { META } from "../lib/content";

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-white" data-testid="landing-page">
      <Nav />
      <Hero />
      <ProcessBento />
      <ArchGrid />
      <Impact />
      <footer className="border-t border-white/10 mt-24" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid md:grid-cols-3 gap-8 text-sm text-white/50">
          <div>
            <div className="font-display font-bold text-white text-lg">ReCircuit</div>
            <p className="mt-2 max-w-xs">{META.title}. Built for {META.psId} · {META.theme}.</p>
          </div>
          <div className="space-y-1">
            <div className="label">Team</div>
            <div className="text-white">{META.team}</div>
          </div>
          <div className="space-y-1 md:text-right">
            <div className="label">Stack</div>
            <div className="text-white">React · FastAPI · MongoDB · Stripe</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
