import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

export const INDIA = [20.59, 78.96];

export const dotIcon = (color = "#7CFC00", size = 14) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid #0a0a0a;box-shadow:0 0 0 4px ${color}44"></span>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
  });

function ClickCapture({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

function Recenter({ center, zoom }) {
  const map = useMap();
  const [lat, lng] = center || [];
  useEffect(() => { if (lat != null && lng != null) map.setView([lat, lng], zoom || map.getZoom()); }, [lat, lng, zoom, map]);
  return null;
}

export default function MapView({ center = INDIA, zoom = 4, markers = [], onClick, className = "h-72", recenter, testId = "map-view" }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 ${className}`} data-testid={testId}>
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' className="dark-tiles" />
        {onClick && <ClickCapture onClick={onClick} />}
        {recenter && <Recenter center={recenter.center} zoom={recenter.zoom} />}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={dotIcon(m.color, m.size)}>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
