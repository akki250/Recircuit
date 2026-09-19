import { Recycle, Scale, MapPin } from "lucide-react";
import { fileUrl, inr, fmtDate } from "../lib/api";

export const STATUS = {
  open: { label: "Open", cls: "bg-white/10 text-white" },
  matched: { label: "Matched", cls: "bg-amber-400/20 text-amber-300" },
  paid: { label: "Paid", cls: "bg-acid/20 text-acid" },
  completed: { label: "Completed", cls: "bg-acid text-black" },
};

export function StatusBadge({ status, className = "" }) {
  const s = STATUS[status] || STATUS.open;
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${s.cls} ${className}`} data-testid={`status-badge-${status}`}>{s.label}</span>;
}

export default function ListingCard({ listing, who, children }) {
  const img = fileUrl(listing.photo_path);
  return (
    <article className="bento overflow-hidden flex flex-col" data-testid={`listing-card-${listing.id}`}>
      <div className="relative h-40 bg-ash">
        {img ? <img src={img} alt={listing.title} className="w-full h-full object-cover" /> : (
          <div className="halftone w-full h-full grid place-items-center text-white/20"><Recycle size={36} /></div>
        )}
        <StatusBadge status={listing.status} className="absolute top-3 left-3 backdrop-blur" />
        <span className="absolute top-3 right-3 glass rounded-full px-2.5 py-1 text-[11px] text-white/80">{listing.category_label}</span>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-display font-bold text-lg leading-tight line-clamp-2" data-testid="listing-title">{listing.title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
            <span className="inline-flex items-center gap-1"><Scale size={12} />{listing.weight_kg} kg · {listing.condition}</span>
            {listing.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{listing.location}</span>}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="label">Estimate</div>
            <div className="font-display font-bold text-2xl text-acid" data-testid="listing-price">{inr(listing.estimated_price)}</div>
          </div>
          <div className="text-right text-xs text-white/50">
            <div>₹{listing.price_per_kg}/kg × {listing.multiplier}</div>
            <div>{fmtDate(listing.created_at)}</div>
          </div>
        </div>
        {who && <div className="text-xs text-white/50">{who}</div>}
        {listing.handover_code && (
          <div className="rounded-xl bg-ink border border-acid/30 px-3 py-2 text-xs flex items-center justify-between" data-testid="handover-record">
            <span className="text-white/50">Digital record</span><span className="font-mono text-acid">{listing.handover_code}</span>
          </div>
        )}
        {children && <div className="mt-auto pt-1 flex flex-wrap gap-2">{children}</div>}
      </div>
    </article>
  );
}
