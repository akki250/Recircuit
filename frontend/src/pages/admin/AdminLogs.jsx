import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/KpiCard";
import { api, inr, fmtDate, errMsg } from "../../lib/api";

const ACTION_CLS = { "payment.completed": "text-acid", "handover.recorded": "text-acid", "listing.matched": "text-amber-300", "listing.created": "text-white", "payment.initiated": "text-white/70" };

export default function AdminLogs() {
  const [logs, setLogs] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api.get("/admin/logs").then((r) => setLogs(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  const rows = (logs || []).filter((l) => !q || `${l.action} ${l.detail} ${l.actor_name} ${l.actor_role}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-8" data-testid="admin-logs-page">
      <PageHeader eyebrow="Admin only" title="Activity logs" sub="Immutable trail of every registration, listing, match, payment and handover."
        action={<input className="field md:w-72" placeholder="Filter logs…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="logs-filter-input" />} />
      <div className="bento-static overflow-hidden">
        <table className="w-full table-dark" data-testid="logs-table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Detail</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={i} data-testid="log-row">
                <td className="whitespace-nowrap text-white/50">{fmtDate(l.created_at)}</td>
                <td><div className="text-white">{l.actor_name}</div><div className="text-[10px] uppercase tracking-wider text-white/40">{l.actor_role}</div></td>
                <td className={`font-mono text-xs ${ACTION_CLS[l.action] || "text-white/70"}`}>{l.action}</td>
                <td className="text-white/80">{l.detail}</td>
                <td className="text-right">{l.amount ? inr(l.amount) : "—"}</td>
              </tr>
            ))}
            {logs && rows.length === 0 && <tr><td colSpan={5} className="text-center text-white/40 py-10">No matching logs.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
