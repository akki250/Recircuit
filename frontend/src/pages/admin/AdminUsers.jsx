import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/KpiCard";
import { api, inr, fmtDate, errMsg } from "../../lib/api";

const ROLE_CLS = { admin: "bg-white text-black", collector: "bg-acid/20 text-acid", recycler: "bg-amber-400/20 text-amber-300" };

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  useEffect(() => { api.get("/admin/users").then((r) => setUsers(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  return (
    <div className="space-y-8" data-testid="admin-users-page">
      <PageHeader eyebrow="Admin only" title="Users" sub="Every collector, recycler and admin on the network." />
      <div className="bento-static overflow-hidden">
        <table className="w-full table-dark" data-testid="users-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Lots</th><th>Wallet</th><th>Joined</th></tr></thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.role}`}>
                <td className="text-white font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${ROLE_CLS[u.role]}`}>{u.role}</span></td>
                <td>{u.listings}</td>
                <td className={u.role === "collector" ? "text-acid font-semibold" : "text-white/40"}>{u.role === "collector" ? inr(u.wallet_balance) : "—"}</td>
                <td className="text-white/50">{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
