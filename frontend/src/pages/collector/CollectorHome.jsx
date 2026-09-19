import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, Scale, PackageCheck, Layers, PlusCircle, MapPinned } from "lucide-react";
import KpiCard, { PageHeader } from "../../components/KpiCard";
import ListingCard from "../../components/ListingCard";
import MapView from "../../components/MapView";
import PickupPanel from "../../components/PickupPanel";
import { api, inr, errMsg } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function CollectorHome() {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [mapData, setMapData] = useState(null);

  const load = useCallback(async () => {
    const [l, w, m] = await Promise.all([api.get("/listings/mine"), api.get("/wallet"), api.get("/map")]);
    setListings(l.data); setWallet(w.data); setMapData(m.data);
  }, []);
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, [load]);

  const handover = async (id) => {
    try { await api.post(`/listings/${id}/handover`); toast.success("Handover recorded — digital code issued"); await load(); refreshUser(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const all = listings || [];
  const kg = all.reduce((a, l) => a + l.weight_kg, 0);
  const sold = all.filter((l) => ["paid", "completed"].includes(l.status));
  const open = all.filter((l) => ["open", "matched"].includes(l.status));
  const myPins = all.filter((l) => l.lat != null && ["open", "matched"].includes(l.status));
  const markers = [
    ...myPins.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, color: "#7CFC00", popup: <div><div className="font-semibold">{l.title}</div><div className="text-xs text-white/60">{l.weight_kg} kg · {inr(l.estimated_price)}</div></div> })),
    ...(mapData?.recyclers || []).map((r) => ({ id: `r-${r.id}`, lat: r.lat, lng: r.lng, color: "#FBBF24", size: 16, popup: <div><div className="font-semibold">{r.name}</div><div className="text-xs text-white/60">Verified recycler</div></div> })),
  ];
  const center = myPins[0] ? [myPins[0].lat, myPins[0].lng] : undefined;

  return (
    <div className="space-y-10" data-testid="collector-home">
      <PageHeader eyebrow="Collector" title={`Namaste, ${user.name.split(" ")[0]}`} sub="Your collection pipeline at a glance."
        action={<Link to="/app/new" className="btn-primary" data-testid="new-listing-button"><PlusCircle size={16} /> New listing</Link>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Wallet balance" value={inr(wallet?.balance)} hint="credited via Stripe" icon={Wallet} accent testId="kpi-wallet" />
        <KpiCard title="Total listed" value={`${kg.toFixed(1)} kg`} hint={`${all.length} lots`} icon={Scale} testId="kpi-kg" />
        <KpiCard title="Lots sold" value={sold.length} trend={sold.length ? `${inr(sold.reduce((a, l) => a + l.estimated_price, 0))}` : null} icon={PackageCheck} testId="kpi-sold" />
        <KpiCard title="Open / matched" value={open.length} hint="awaiting recycler" icon={Layers} testId="kpi-open" />
      </div>
      <section className="bento-static p-6" data-testid="collector-map-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg inline-flex items-center gap-2"><MapPinned size={18} className="text-acid" /> Your open lots & nearby recyclers</h2>
          <span className="text-xs text-white/40" data-testid="collector-map-legend">lime = your lot · amber = recycler ({mapData?.recyclers?.length ?? 0})</span>
        </div>
        <MapView className="h-72" center={center} zoom={center ? 6 : 4} markers={markers} testId="collector-map" />
      </section>
      <section>
        <h2 className="font-display font-bold text-xl mb-4">My lots</h2>
        {listings && listings.length === 0 && (
          <div className="bento-static p-10 text-center text-white/50" data-testid="empty-listings">No lots yet. <Link to="/app/new" className="text-acid">Capture your first item →</Link></div>
        )}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {all.map((l) => (
            <ListingCard key={l.id} listing={l} who={l.recycler_name ? `Recycler: ${l.recycler_name}` : "Awaiting a recycler match"}>
              {l.status === "paid" && <button onClick={() => handover(l.id)} className="btn-primary !py-2 w-full" data-testid={`handover-button-${l.id}`}>Confirm handover</button>}
              {l.status === "matched" && <span className="text-xs text-amber-300">Recycler is completing payment…</span>}
              {["matched", "paid"].includes(l.status) && <PickupPanel listing={l} role="collector" onChange={load} />}
            </ListingCard>
          ))}
        </div>
      </section>
    </div>
  );
}
