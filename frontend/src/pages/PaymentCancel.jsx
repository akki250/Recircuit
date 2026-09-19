import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-ink text-white grid place-items-center p-6 halftone" data-testid="payment-cancel-page">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center fade-up">
        <XCircle size={48} className="mx-auto text-amber-300" />
        <h1 className="mt-6 font-display font-bold text-3xl">Payment cancelled</h1>
        <p className="mt-3 text-sm text-white/60">No money moved. The lot stays matched to you — pay whenever you're ready.</p>
        <Link to="/app/purchases" className="btn-secondary mt-8 w-full" data-testid="cancel-back-button">Back to My Purchases</Link>
      </div>
    </div>
  );
}
