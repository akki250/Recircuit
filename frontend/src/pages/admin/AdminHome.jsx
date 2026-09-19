import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Scale, IndianRupee, Layers, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard, { PageHeader } from "../../components/KpiCard";
import { StatusBadge } from "../../components/ListingCard";
import { api, inr, fmtDate, errMsg } from "../../lib/api";
import { IMAGES } from "../../lib/content";

export default function AdminHome() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  const k = data?.kpis || {};
  return (
    <div className="space-y-8" data-testid="admin-home">
      <PageHeader eyebrow="Admin" title="Network overview" sub="Every listing, payment and handover across all collectors and recyclers." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Kg recycled" value={`${k.total_kg ?? 0} kg`} trend={`${k.lots_completed ?? 0} completed`} icon={Scale} testId="kpi-admin-kg" />
        <KpiCard title="₹ paid out" value={inr(k.rupees_paid)} hint="via Stripe" icon={IndianRupee} accent testId="kpi-admin-rupees" />
        <KpiCard title="Active lots" value={k.active_lots ?? 0} hint="open + matched" icon={Layers} testId="kpi-admin-active" />
        <KpiCard title="Users" value={k.users ?? 0} hint={`${k.collectors ?? 0} collectors · ${k.recyclers ?? 0} recyclers`} icon={Users} testId="kpi-admin-users" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bento-static p-6" data-testid="admin-chart">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display font-bold text-lg">Kg recycled · last 14 days</h2><span className="text-xs text-white/40">settled lots</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.chart || []} margin={{ left: -20, right: 8 }}>
              <defs><linearGradient id="acid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7CFC00" stopOpacity={0.45} /><stop offset="100%" stopColor="#7CFC00" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#9CA3AF" }} itemStyle={{ color: "#7CFC00" }} />
              <Area type="monotone" dataKey="kg" stroke="#7CFC00" strokeWidth={2} fill="url(#acid)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="relative bento-static overflow-hidden p-6 min-h-[300px]" data-testid="admin-recent-logs">
          <img src={IMAGES.glow} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/90 to-coal/40" />
          <div className="relative"><h2 className="font-display font-bold text-lg mb-4">Latest activity</h2>
            <ul className="space-y-3">
              {(data?.recent_logs || []).map((l, i) => (
                <li key={i} className="text-xs border-l-2 border-acid/50 pl-3"><div className="text-white/90 line-clamp-2">{l.detail}</div><div className="text-white/40 mt-0.5">{l.actor_role} · {fmtDate(l.created_at)}</div></li>
              ))}
            </ul></div>
        </div>
      </div>
      <div className="bento-static overflow-hidden">
        <table className="w-full table-dark" data-testid="admin-recent-listings">
          <thead><tr><th>Lot</th><th>Collector</th><th>Recycler</th><th>Status</th><th className="text-right">Value</th></tr></thead>
          <tbody>{(data?.recent_listings || []).map((l) => (
            <tr key={l.id}><td className="text-white">{l.title}<div className="text-xs text-white/40">{l.weight_kg} kg · {l.category_label}</div></td><td>{l.collector_name}</td><td>{l.recycler_name || "—"}</td><td><StatusBadge status={l.status} /></td><td className="text-right text-acid font-semibold">{inr(l.estimated_price)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
