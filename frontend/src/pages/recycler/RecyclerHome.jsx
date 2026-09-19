import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Handshake, MapPinned, Save } from "lucide-react";
import { PageHeader } from "../../components/KpiCard";
import ListingCard from "../../components/ListingCard";
import MapView from "../../components/MapView";
import LocationPicker from "../../components/LocationPicker";
import { api, inr, errMsg } from "../../lib/api";
import { IMAGES } from "../../lib/content";
import { useAuth } from "../../context/AuthContext";

export default function RecyclerHome() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState(null);
  const [pick, setPick] = useState(null);
  const hasLoc = user.lat != null && user.lng != null;

  const load = useCallback(() => {
    const params = hasLoc ? { lat: user.lat, lng: user.lng } : {};
    return api.get("/listings/open", { params }).then((r) => setListings(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [hasLoc, user.lat, user.lng]);
  useEffect(() => { load(); }, [load]);

  const match = async (l) => {
    try {
      await api.post(`/listings/${l.id}/match`);
      toast.success(`Matched with "${l.title}" — complete payment to lock it in`);
      nav("/app/purchases");
    } catch (e) { toast.error(errMsg(e)); load(); }
  };

  const saveLocation = async () => {
    try { await api.put("/me/location", pick); await refreshUser(); toast.success("Facility location saved — lots are now sorted by distance"); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const all = listings || [];
  const totalKg = all.reduce((a, l) => a + l.weight_kg, 0);
  const markers = [
    ...all.filter((l) => l.lat != null).map((l) => ({
      id: l.id, lat: l.lat, lng: l.lng, color: "#7CFC00",
      popup: (<div className="space-y-1 min-w-[180px]"><div className="font-semibold">{l.title}</div><div className="text-xs text-white/60">{l.weight_kg} kg · {l.category_label}{l.distance_km != null ? ` · ${l.distance_km} km away` : ""}</div><div className="text-acid font-bold">{inr(l.estimated_price)}</div><button onClick={() => match(l)} className="btn-primary !py-1.5 !px-3 text-xs w-full mt-1" data-testid={`map-match-button-${l.id}`}>Match this lot</button></div>),
    })),
    ...(hasLoc ? [{ id: "me", lat: user.lat, lng: user.lng, color: "#F3F4F6", size: 18, popup: <div className="font-semibold">Your facility · {user.name}</div> }] : []),
  ];

  return (
    <div className="space-y-8" data-testid="recycler-home">
      <PageHeader eyebrow="Step 4 · Match" title="Open lots marketplace" sub="Lock a match, pay via Stripe or Razorpay, and record the handover." />
      <div className="relative bento-static overflow-hidden h-44">
        <img src={IMAGES.recycler} alt="Recycling facility" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <div className="relative h-full flex items-center px-8 gap-10">
          <div><div className="label">Available now</div><div className="font-display font-bold text-3xl" data-testid="market-count">{all.length} lots</div></div>
          <div><div className="label">Total weight</div><div className="font-display font-bold text-3xl">{totalKg.toFixed(1)} kg</div></div>
          <div><div className="label">Total value</div><div className="font-display font-bold text-3xl text-acid">{inr(all.reduce((a, l) => a + l.estimated_price, 0))}</div></div>
        </div>
      </div>

      <section className="bento-static p-6" data-testid="market-map-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg inline-flex items-center gap-2"><MapPinned size={18} className="text-acid" /> {hasLoc ? "Open lots near your facility" : "Set your facility location"}</h2>
          {hasLoc && <span className="text-xs text-white/40">lime = open lot · white = you</span>}
        </div>
        {hasLoc ? (
          <MapView className="h-80" center={[user.lat, user.lng]} zoom={5} markers={markers} testId="market-map" />
        ) : (
          <div className="space-y-3">
            <LocationPicker value={pick} onChange={setPick} label="Facility location" className="h-64" />
            <button onClick={saveLocation} disabled={!pick} className="btn-primary" data-testid="save-facility-location-button"><Save size={16} /> Save facility location</button>
          </div>
        )}
      </section>

      {listings && listings.length === 0 && <div className="bento-static p-10 text-center text-white/50" data-testid="empty-market">No open lots right now. Check back soon.</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {all.map((l) => (
          <ListingCard key={l.id} listing={l} who={`Collector: ${l.collector_name}${l.distance_km != null ? ` · ${l.distance_km} km away` : ""}`}>
            <button onClick={() => match(l)} className="btn-primary !py-2 w-full" data-testid={`match-button-${l.id}`}><Handshake size={16} /> Match this lot</button>
          </ListingCard>
        ))}
      </div>
    </div>
  );
}
