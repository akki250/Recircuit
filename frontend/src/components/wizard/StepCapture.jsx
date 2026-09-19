import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle2 } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import LocationPicker from "../LocationPicker";

export default function StepCapture({ form, update }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update({ preview: URL.createObjectURL(file), photo_path: null });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      update({ photo_path: data.path });
      toast.success("Photo uploaded to secure storage");
    } catch (err) { toast.error(errMsg(err)); update({ preview: null }); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-6" data-testid="step-capture">
      <div><span className="eyebrow">Step 1 · Capture</span><h2 className="mt-2 font-display font-bold text-2xl">Photo of the material</h2></div>
      <button type="button" onClick={() => inputRef.current?.click()} data-testid="photo-dropzone"
        className={`relative w-full rounded-3xl border-2 border-dashed overflow-hidden transition-colors duration-200 ${form.preview ? "border-acid/50" : "border-white/15 hover:border-acid/50 bg-ink"} h-56 grid place-items-center`}>
        {form.preview ? <img src={form.preview} alt="preview" className="absolute inset-0 w-full h-full object-cover" /> : (
          <div className="text-center text-white/50"><Camera size={32} className="mx-auto mb-3 text-acid" /><div className="text-sm">Tap to capture or upload a photo</div><div className="text-xs mt-1">JPG · PNG · WEBP up to 8 MB</div></div>
        )}
        {form.preview && (
          <span className="absolute bottom-3 right-3 glass rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5" data-testid="upload-status">
            {uploading ? <><Upload size={12} className="animate-pulse" /> Uploading…</> : form.photo_path ? <><CheckCircle2 size={12} className="text-acid" /> Stored</> : "Failed"}
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} data-testid="photo-input" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label mb-2" htmlFor="title">Lot title</label>
          <input id="title" className="field" value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. 4 old laptops + chargers" data-testid="listing-title-input" /></div>
        <div><label className="label mb-2" htmlFor="location">Pickup area</label>
          <input id="location" className="field" value={form.location} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Seelampur, Delhi" data-testid="listing-location-input" /></div>
      </div>
      <LocationPicker value={form.lat != null ? { lat: form.lat, lng: form.lng } : null} onChange={({ lat, lng }) => update({ lat, lng })} />
    </div>
  );
}
