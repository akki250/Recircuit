import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, PlusCircle, Wallet, ShoppingBag, ScrollText, Users, LogOut, Recycle, Home, UserCog } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { inr } from "../lib/api";
import NotificationBell from "./NotificationBell";

const PROFILE = { to: "/app/profile", label: "Profile & Alerts", icon: UserCog };
const NAV = {
  collector: [
    { to: "/app", label: "Overview", icon: LayoutGrid, end: true },
    { to: "/app/new", label: "New Listing", icon: PlusCircle },
    { to: "/app/wallet", label: "Wallet", icon: Wallet },
    PROFILE,
  ],
  recycler: [
    { to: "/app", label: "Marketplace", icon: LayoutGrid, end: true },
    { to: "/app/purchases", label: "My Purchases", icon: ShoppingBag },
    PROFILE,
  ],
  admin: [
    { to: "/app", label: "Overview", icon: LayoutGrid, end: true },
    { to: "/app/logs", label: "Activity Logs", icon: ScrollText },
    { to: "/app/users", label: "Users", icon: Users },
    PROFILE,
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user.role] || [];

  return (
    <div className="min-h-screen bg-ink text-white flex" data-testid="dashboard-layout">
      <aside className="hidden md:flex w-64 shrink-0 fixed inset-y-0 bg-coal border-r border-white/10 flex-col" data-testid="sidebar">
        <Link to="/home" className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-acid text-black"><Recycle size={18} /></span>
          <span className="font-display font-bold">ReCircuit</span>
        </Link>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} end={it.end} data-testid={`sidebar-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-200 border-l-2 ${isActive ? "text-acid bg-acid/10 border-acid" : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"}`}>
                <Icon size={18} /> {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="glass-light rounded-2xl p-4">
            <div className="text-sm font-medium truncate" data-testid="sidebar-user-name">{user.name}</div>
            <div className="text-xs text-white/50 truncate">{user.email}</div>
            <span className="mt-2 inline-block text-[10px] uppercase tracking-[0.2em] text-acid" data-testid="sidebar-user-role">{user.role}</span>
            {user.role === "collector" && <div className="mt-2 text-xs text-white/60">Wallet <span className="text-white font-medium" data-testid="sidebar-wallet">{inr(user.wallet_balance)}</span></div>}
          </div>
          <button onClick={async () => { await logout(); nav("/home"); }} className="btn-ghost w-full mt-2 justify-center" data-testid="logout-button"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 min-w-0">
        <header className="sticky top-0 z-30 glass border-x-0 border-t-0 rounded-none h-16 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3 md:hidden"><span className="grid place-items-center w-8 h-8 rounded-full bg-acid text-black"><Recycle size={16} /></span><span className="font-display font-bold">ReCircuit</span></div>
          <div className="hidden md:block text-xs uppercase tracking-[0.2em] text-white/40">{user.role} workspace</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/home" className="btn-ghost" data-testid="topbar-home-link"><Home size={16} /> Site</Link>
            <button onClick={async () => { await logout(); nav("/home"); }} className="btn-ghost md:hidden" data-testid="logout-button-mobile"><LogOut size={16} /></button>
          </div>
        </header>
        <nav className="md:hidden flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${isActive ? "bg-acid text-black" : "bg-white/5 text-white/70"}`}>{it.label}</NavLink>
          ))}
        </nav>
        <main className="p-6 lg:p-10 max-w-7xl"><Outlet /></main>
      </div>
    </div>
  );
}
