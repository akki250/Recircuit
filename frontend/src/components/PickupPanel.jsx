import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, RotateCcw, Send } from "lucide-react";
import { api, errMsg } from "../lib/api";

const fmt = (iso) => new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function PickupPanel({ listing, role, onChange }) {
  const [slots, setSlots] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const status = listing.pickup_status || "none";

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); onChange(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const propose = () => {
    const iso = slots.filter(Boolean).map((s) => new Date(s).toISOString());
    if (!iso.length) return toast.error("Add at least one slot");
    run(() => api.post(`/listings/${listing.id}/pickup/propose`, { slots: iso }), "Pickup slots sent to the collector");
  };

  if (status === "confirmed") {
    return <div className="w-full rounded-xl bg-acid/10 border border-acid/30 px-3 py-2 text-xs flex items-center gap-2" data-testid={`pickup-confirmed-${listing.id}`}><CalendarClock size={14} className="text-acid" /><span className="text-white/60">Pickup</span><span className="font-semibold text-acid">{fmt(listing.pickup_at)}</span></div>;
  }

  if (role === "collector") {
    if (status !== "proposed") return null;
    return (
      <div className="w-full rounded-xl bg-ink border border-sky-400/30 p-3 space-y-2" data-testid={`pickup-proposal-${listing.id}`}>
        <div className="label !text-sky-300">Pick a pickup slot</div>
        {listing.pickup_slots.map((s) => (
          <button key={s} disabled={busy} onClick={() => run(() => api.post(`/listings/${listing.id}/pickup/confirm`, { slot: s }), "Pickup confirmed")} className="btn-white !py-2 w-full !justify-between text-xs" data-testid={`pickup-slot-button-${listing.id}`}>{fmt(s)} <Check size={14} /></button>
        ))}
        <button disabled={busy} onClick={() => run(() => api.post(`/listings/${listing.id}/pickup/decline`), "Asked the recycler for other slots")} className="btn-ghost w-full justify-center text-xs" data-testid={`pickup-decline-button-${listing.id}`}><RotateCcw size={12} /> None work — ask for other slots</button>
      </div>
    );
  }

  if (status === "proposed") {
    return <div className="w-full rounded-xl bg-ink border border-white/10 px-3 py-2 text-xs" data-testid={`pickup-waiting-${listing.id}`}><div className="text-white/50">Waiting for collector to pick a slot</div><div className="mt-1 text-white/80">{listing.pickup_slots.map(fmt).join(" · ")}</div></div>;
  }
  return (
    <div className="w-full rounded-xl bg-ink border border-white/10 p-3 space-y-2" data-testid={`pickup-propose-${listing.id}`}>
      <div className="label">{status === "declined" ? "Collector asked for other slots" : "Propose pickup slots (up to 3)"}</div>
      {slots.map((s, i) => <input key={i} type="datetime-local" className="field !py-2 text-xs" value={s} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} data-testid={`pickup-slot-input-${i}`} />)}
      <button disabled={busy} onClick={propose} className="btn-secondary !py-2 w-full text-xs" data-testid={`pickup-propose-button-${listing.id}`}><Send size={12} /> Send slots</button>
    </div>
  );
}
