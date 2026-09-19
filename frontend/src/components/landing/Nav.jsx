import { Link } from "react-router-dom";
import { Recycle, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Nav() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-40 glass border-x-0 border-t-0 rounded-none" data-testid="landing-nav">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-3" data-testid="nav-logo">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-acid text-black"><Recycle size={18} /></span>
          <span className="font-display font-bold tracking-tight">ReCircuit</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[["#process", "Process"], ["#architecture", "System"], ["#impact", "Impact"]].map(([href, label]) => (
            <a key={href} href={href} className="btn-ghost" data-testid={`nav-link-${label.toLowerCase()}`}>{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/app" className="btn-primary !py-2" data-testid="nav-dashboard-button">Dashboard <ArrowRight size={16} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" data-testid="nav-signin-link">Sign in</Link>
              <Link to="/register" className="btn-white !py-2" data-testid="nav-getstarted-button">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
