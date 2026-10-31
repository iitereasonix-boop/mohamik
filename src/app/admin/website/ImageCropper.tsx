"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, X, ZoomIn } from "lucide-react";

export type CropShape = { label: string; ratio: number; width: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Crop an image in the browser: drag to position, slider to zoom. The crop is
// stored relative to the image (centre + zoom) so it survives a resized window.
export default function ImageCropper({
  file,
  shapes,
  keepTransparency,
  onCancel,
  onDone,
}: {
  file: File;
  shapes: CropShape[];
  keepTransparency: boolean;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const [src, setSrc] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [shape, setShape] = useState(shapes[0]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [frameWidth, setFrameWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    const measure = () => setFrameWidth(frameRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [image, shape]);

  const W = frameWidth;
  const H = W / shape.ratio;
  const scale = image && W ? Math.max(W / image.naturalWidth, H / image.naturalHeight) * zoom : 1;
  const dw = (image?.naturalWidth ?? 0) * scale;
  const dh = (image?.naturalHeight ?? 0) * scale;
  // keep the frame fully covered by the image
  const fit = (c: { x: number; y: number }) => ({
    x: dw ? clamp(c.x, W / (2 * dw), 1 - W / (2 * dw)) : 0.5,
    y: dh ? clamp(c.y, H / (2 * dh), 1 - H / (2 * dh)) : 0.5,
  });
  const c = fit(center);
  const left = W / 2 - c.x * dw;
  const top = H / 2 - c.y * dh;

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: c.x, y: c.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !dw) return;
    setCenter(fit({ x: d.x - (e.clientX - d.px) / dw, y: d.y - (e.clientY - d.py) / dh }));
  }

  function save() {
    if (!image || !W) return;
    setBusy(true);
    const sw = W / scale;
    const sh = H / scale;
    const outW = Math.round(Math.min(shape.width, sw));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = Math.round(outW / shape.ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return setBusy(false);
    if (!keepTransparency) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, -left / scale, -top / scale, sw, sh, 0, 0, canvas.width, canvas.height);
    const type = keepTransparency ? "image/png" : "image/jpeg";
    canvas.toBlob((blob) => {
      setBusy(false);
      if (blob) onDone(new File([blob], keepTransparency ? "cropped.png" : "cropped.jpg", { type }));
    }, type, 0.9);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="قص الصورة" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-3xl bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-[#0f1c36]">قص الصورة</h3>
            <p className="text-xs text-warmgray-500">اسحب الصورة لتحريكها، واستخدم الشريط للتكبير.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          {failed ? (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">تعذّر فتح هذه الصورة. استخدم PNG أو JPG أو WEBP.</p>
          ) : (
            <>
              {shapes.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {shapes.map((s) => (
                    <button key={s.label} type="button" onClick={() => { setShape(s); setZoom(1); }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${s.label === shape.label ? "bg-[#0f1c36] text-[#f1dfb3]" : "border border-slate-200 text-slate-600 hover:border-[#b08d57]"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                ref={frameRef}
                dir="ltr"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
                className="relative mx-auto w-full cursor-move touch-none select-none overflow-hidden rounded-xl bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:20px_20px] ring-2 ring-[#d4af6a]"
                style={{ aspectRatio: String(shape.ratio), maxWidth: shape.ratio < 1.2 ? 340 : undefined }}
              >
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    onLoad={(e) => setImage(e.currentTarget)}
                    onError={() => setFailed(true)}
                    className="pointer-events-none absolute max-w-none"
                    style={{ left, top, width: dw || undefined, height: dh || undefined, visibility: dw ? "visible" : "hidden" }}
                  />
                )}
              </div>

              <label className="flex items-center gap-3 text-sm">
                <ZoomIn size={18} className="shrink-0 text-[#b08d57]" />
                <span className="sr-only">التكبير</span>
                <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#0f1c36]" />
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onCancel} className="btn-secondary">إلغاء</button>
          <button type="button" onClick={save} disabled={!image || failed || busy} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />} قص ورفع
          </button>
        </div>
      </div>
    </div>
  );
}
