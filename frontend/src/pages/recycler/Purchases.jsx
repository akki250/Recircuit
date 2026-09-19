import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, FileCheck2, ShoppingBag, IndianRupee } from "lucide-react";
import KpiCard, { PageHeader } from "../../components/KpiCard";
import ListingCard from "../../components/ListingCard";
import PayMenu from "../../components/PayMenu";
import PickupPanel from "../../components/PickupPanel";
import { api, inr, errMsg } from "../../lib/api";

export default function Purchases() {
  const [listings, setListings] = useState(null);
  const [choosing, setChoosing] = useState(null);
  const load = useCallback(() => api.get("/listings/purchases").then((r) => setListings(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const handover = async (l) => {
    try { await api.post(`/listings/${l.id}/handover`); toast.success("Handover recorded — digital code issued"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const all = listings || [];
  const spent = all.filter((l) => ["paid", "completed"].includes(l.status)).reduce((a, l) => a + l.estimated_price, 0);
  return (
    <div className="space-y-8" data-testid="purchases-page">
      <PageHeader eyebrow="Steps 5–6 · Handover & Payment" title="My purchases" sub="Pay matched lots through Stripe or Razorpay, then confirm the physical handover." />
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard title="Lots" value={all.length} icon={ShoppingBag} testId="kpi-purchases" />
        <KpiCard title="Awaiting payment" value={all.filter((l) => l.status === "matched").length} icon={CreditCard} testId="kpi-awaiting" />
        <KpiCard title="Paid to collectors" value={inr(spent)} icon={IndianRupee} accent testId="kpi-spent" />
      </div>
      {listings && listings.length === 0 && <div className="bento-static p-10 text-center text-white/50" data-testid="empty-purchases">No purchases yet — match a lot in the marketplace.</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {all.map((l) => (
          <ListingCard key={l.id} listing={l} who={`Collector: ${l.collector_name}`}>
            {l.status === "matched" && choosing !== l.id && <button onClick={() => setChoosing(l.id)} className="btn-primary !py-2 w-full" data-testid={`pay-button-${l.id}`}><CreditCard size={16} /> Pay {inr(l.estimated_price)}</button>}
            {l.status === "matched" && choosing === l.id && <PayMenu listing={l} onPaid={() => { setChoosing(null); load(); }} onClose={() => setChoosing(null)} />}
            {l.status === "paid" && <button onClick={() => handover(l)} className="btn-white !py-2 w-full" data-testid={`handover-button-${l.id}`}><FileCheck2 size={16} /> Confirm handover</button>}
            {["matched", "paid"].includes(l.status) && <PickupPanel listing={l} role="recycler" onChange={load} />}
          </ListingCard>
        ))}
      </div>
    </div>
  );
}
