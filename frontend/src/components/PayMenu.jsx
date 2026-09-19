import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, IndianRupee, X } from "lucide-react";
import { api, inr, errMsg } from "../lib/api";

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = resolve; s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
  document.body.appendChild(s);
});

export default function PayMenu({ listing, onPaid, onClose }) {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { api.get("/payments/config").then((r) => setConfig(r.data)).catch(() => setConfig({ stripe_enabled: true, razorpay_enabled: false })); }, []);

  const payStripe = async () => {
    setBusy("stripe");
    try {
      const { data } = await api.post(`/listings/${listing.id}/checkout`, { origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(errMsg(e)); setBusy(null); }
  };

  const payRazorpay = async () => {
    setBusy("razorpay");
    try {
      await loadRazorpay();
      const { data } = await api.post(`/listings/${listing.id}/razorpay/order`);
      const rz = new window.Razorpay({
        key: data.key_id, amount: data.amount, currency: data.currency, name: data.name, description: data.description, order_id: data.order_id,
        prefill: data.prefill, theme: { color: "#7CFC00", backdrop_color: "rgba(10,10,10,0.85)" },
        handler: async (resp) => {
          try { await api.post("/payments/razorpay/verify", resp); toast.success("Razorpay payment verified — collector wallet credited"); onPaid(); }
          catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rz.open();
    } catch (e) { toast.error(errMsg(e)); setBusy(null); }
  };

  return (
    <div className="w-full rounded-2xl bg-ink border border-white/10 p-3 space-y-2" data-testid={`pay-menu-${listing.id}`}>
      <div className="flex items-center justify-between px-1"><span className="label">Pay {inr(listing.estimated_price)} with</span><button onClick={onClose} className="text-white/40 hover:text-white" data-testid="pay-menu-close"><X size={14} /></button></div>
      <button onClick={payStripe} disabled={!!busy} className="btn-white !py-2 w-full" data-testid={`pay-stripe-button-${listing.id}`}><CreditCard size={16} /> {busy === "stripe" ? "Redirecting…" : "Stripe · international (test)"}</button>
      <button onClick={payRazorpay} disabled={!!busy || !config?.razorpay_enabled} className="btn-primary !py-2 w-full" data-testid={`pay-razorpay-button-${listing.id}`}><IndianRupee size={16} /> {busy === "razorpay" ? "Opening…" : "Razorpay · UPI, cards, netbanking"}</button>
      {config && !config.razorpay_enabled && <p className="text-[11px] text-white/40 px-1" data-testid="razorpay-not-configured">Razorpay is wired but waiting for keys — add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend/.env.</p>}
    </div>
  );
}
