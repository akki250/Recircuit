import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Smartphone } from "lucide-react";
import { api, fmtDate } from "../lib/api";

const KIND = { match: "bg-amber-400", payment: "bg-acid", pickup: "bg-sky-400", handover: "bg-white", info: "bg-white/50" };

export default function NotificationBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => api.get("/notifications").then((r) => setData(r.data)).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const deliveryLabel = (d) => d?.status === "sent" ? `sent via ${d.channel}` : d?.reason === "no_phone" ? "in-app · add a phone for SMS" : d?.reason === "twilio_not_configured" ? "in-app · SMS pending keys" : d?.status === "failed" ? "SMS failed" : "in-app";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative" data-testid="notification-bell">
        <Bell size={16} /> Alerts
        {data.unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-acid text-black text-[10px] font-bold grid place-items-center" data-testid="notification-unread-badge">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-y-auto glass rounded-2xl p-3 z-50 fade-up" data-testid="notification-panel">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
            <span className="label">Alerts</span>
            <button onClick={markAll} disabled={!data.unread} className="btn-ghost !py-1 !px-2 text-xs" data-testid="notifications-read-all"><CheckCheck size={14} /> Mark all read</button>
          </div>
          {data.items.length === 0 && <div className="p-6 text-center text-sm text-white/40" data-testid="notifications-empty">No alerts yet.</div>}
          <ul className="divide-y divide-white/5">
            {data.items.map((n) => (
              <li key={n.id} className={`px-2 py-3 flex gap-3 ${n.read ? "opacity-60" : ""}`} data-testid="notification-item">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${KIND[n.kind] || KIND.info}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-xs text-white/70 mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-white/40 mt-1 inline-flex items-center gap-1"><Smartphone size={10} /> {deliveryLabel(n.delivery)} · {fmtDate(n.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
