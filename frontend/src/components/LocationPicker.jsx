import { useState } from "react";
import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
import MapView, { INDIA } from "./MapView";

export default function LocationPicker({ value, onChange, label = "Pickup location", className = "h-56" }) {
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported — tap the map instead");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { onChange({ lat: p.coords.latitude, lng: p.coords.longitude }); setBusy(false); },
      () => { toast.error("Location permission denied — tap the map to drop a pin"); setBusy(false); },
      { timeout: 8000 }
    );
  };
  const has = value?.lat != null;
  return (
    <div data-testid="location-picker">
      <div className="flex items-center justify-between mb-2">
        <span className="label">{label}</span>
        <button type="button" onClick={locate} disabled={busy} className="btn-secondary !py-1.5 !px-3 text-xs" data-testid="use-my-location-button"><LocateFixed size={14} /> {busy ? "Locating…" : "Use my location"}</button>
      </div>
      <MapView className={className} center={has ? [value.lat, value.lng] : INDIA} zoom={has ? 12 : 4}
        markers={has ? [{ id: "picked", lat: value.lat, lng: value.lng, color: "#7CFC00", size: 16 }] : []}
        onClick={(ll) => onChange({ lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5) })}
        recenter={has ? { center: [value.lat, value.lng], zoom: 12 } : null} testId="location-picker-map" />
      <div className="mt-2 text-xs text-white/50" data-testid="picked-coords">{has ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : "Tap the map to drop a pin, or use your location"}</div>
    </div>
  );
}
