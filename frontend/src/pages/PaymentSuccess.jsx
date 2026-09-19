import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api, inr } from "../lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [state, setState] = useState("checking");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sid) return setState("missing");
    let tries = 0; let t;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        setData(data);
        if (data.payment_status === "paid") return setState("paid");
        if (data.status === "expired") return setState("expired");
      } catch { /* retry */ }
      if (++tries >= 12) return setState("timeout");
      t = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(t);
  }, [sid]);

  const views = {
    checking: { icon: Clock, title: "Confirming payment…", text: "Talking to Stripe. This usually takes a couple of seconds.", cls: "text-white" },
    paid: { icon: CheckCircle2, title: "Payment settled", text: `${inr(data?.amount)} has been credited to the collector's wallet. Confirm the handover once the lot is picked up.`, cls: "text-acid" },
    expired: { icon: XCircle, title: "Session expired", text: "The checkout session expired. Start the payment again from My Purchases.", cls: "text-red-400" },
    timeout: { icon: Clock, title: "Still processing", text: "Stripe hasn't confirmed yet. Check My Purchases in a moment — the status updates automatically.", cls: "text-amber-300" },
    missing: { icon: XCircle, title: "No session found", text: "This page needs a Stripe session id.", cls: "text-red-400" },
  };
  const v = views[state]; const Icon = v.icon;

  return (
    <div className="min-h-screen bg-ink text-white grid place-items-center p-6 halftone" data-testid="payment-success-page">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center fade-up">
        <Icon size={48} className={`mx-auto ${v.cls} ${state === "checking" ? "animate-pulse" : ""}`} />
        <h1 className="mt-6 font-display font-bold text-3xl" data-testid="payment-status-title">{v.title}</h1>
        <p className="mt-3 text-sm text-white/60" data-testid="payment-status-text">{v.text}</p>
        {sid && <div className="mt-6 rounded-xl bg-ink border border-white/10 px-4 py-3 text-left text-xs"><div className="label">Stripe session</div><div className="mt-1 font-mono text-white/70 break-all">{sid}</div></div>}
        <Link to="/app/purchases" className="btn-primary mt-8 w-full" data-testid="payment-back-button">Go to My Purchases</Link>
      </div>
    </div>
  );
}
