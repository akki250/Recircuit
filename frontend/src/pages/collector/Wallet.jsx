import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowDownLeft } from "lucide-react";
import KpiCard, { PageHeader } from "../../components/KpiCard";
import { api, inr, fmtDate, errMsg } from "../../lib/api";

export default function Wallet() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/wallet").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  const entries = data?.entries || [];
  return (
    <div className="space-y-10" data-testid="wallet-page">
      <PageHeader eyebrow="Step 6 · Payment" title="Wallet & earnings" sub="Every credit is a settled Stripe payment from a recycler." />
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard title="Balance" value={inr(data?.balance)} icon={WalletIcon} accent testId="wallet-balance" />
        <KpiCard title="Credits" value={entries.length} hint="settled lots" icon={ArrowDownLeft} testId="wallet-credits" />
        <KpiCard title="Average per lot" value={inr(entries.length ? entries.reduce((a, e) => a + e.amount, 0) / entries.length : 0)} testId="wallet-avg" />
      </div>
      <div className="bento-static overflow-hidden">
        <table className="w-full table-dark" data-testid="ledger-table">
          <thead><tr><th>Lot</th><th>From</th><th>When</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.session_id + i} data-testid="ledger-row">
                <td className="text-white">{e.title}</td>
                <td>{e.counterparty || "—"}</td>
                <td>{fmtDate(e.created_at)}</td>
                <td className="text-right text-acid font-semibold">+{inr(e.amount)}</td>
              </tr>
            ))}
            {data && entries.length === 0 && <tr><td colSpan={4} className="text-center text-white/40 py-10">No credits yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
