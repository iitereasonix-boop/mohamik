"use client";

import { useRef, useState } from "react";
import ImageCropper, { type CropShape } from "./ImageCropper";

const SHAPES: Record<"LOGO" | "COVER" | "BACKGROUND", CropShape[]> = {
  LOGO: [{ label: "مربع", ratio: 1, width: 800 }, { label: "عرضي", ratio: 2, width: 1000 }],
  COVER: [{ label: "عرضي 16:9", ratio: 16 / 9, width: 2000 }, { label: "عريض 21:9", ratio: 21 / 9, width: 2400 }],
  BACKGROUND: [{ label: "شريط 4:1", ratio: 4, width: 2400 }, { label: "شريط 3:1", ratio: 3, width: 2400 }],
};

// Logo / cover picker: upload from the device (saved and published at once)
// or paste a public HTTPS link (saved with the rest of the form).
export default function ImageField({
  kind,
  label,
  hint,
  value,
  onChange,
}: {
  kind: "LOGO" | "COVER" | "BACKGROUND";
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showUrl, setShowUrl] = useState(Boolean(value) && !value.startsWith("/api/"));
  const [cropping, setCropping] = useState<File | null>(null);

  // re-crop an image already uploaded to this firm
  async function cropCurrent() {
    setMessage(null);
    const blob = await fetch(value).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    if (blob) setCropping(new File([blob], "current", { type: blob.type }));
    else setMessage({ ok: false, text: "تعذّر فتح الصورة الحالية." });
  }

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("kind", kind);
      body.append("file", file);
      const response = await fetch("/api/admin/website/upload", { method: "POST", body });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage({ ok: false, text: result?.error ?? "تعذّر رفع الصورة." });
        return;
      }
      onChange(result.url);
      setShowUrl(false);
      setMessage({ ok: true, text: "تم رفع الصورة ونشرها على موقعك وبوابة عملائك." });
    } catch {
      setMessage({ ok: false, text: "تعذّر الاتصال بالخادم." });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isLogo = kind === "LOGO";

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 block text-sm font-semibold">{label}</p>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 sm:flex-row sm:items-center">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ${isLogo ? "h-24 w-24" : "h-24 w-full sm:w-44"}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={isLogo ? "h-full w-full object-contain p-2" : "h-full w-full object-cover"} />
          ) : (
            <span className="px-2 text-center text-xs text-slate-400">لا توجد صورة</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? "جارٍ الرفع..." : value ? "تغيير الصورة من الجهاز" : "رفع صورة من الجهاز"}
            </button>
            <button type="button" onClick={() => setShowUrl((v) => !v)} className="btn-secondary text-sm">
              {showUrl ? "إخفاء الرابط" : "استخدام رابط بدلًا من ذلك"}
            </button>
            {value.startsWith("/api/") && (
              <button type="button" onClick={cropCurrent} disabled={uploading} className="btn-secondary text-sm">قص الصورة</button>
            )}
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setMessage({ ok: true, text: "أُزيلت الصورة. اضغط «حفظ ونشر التعديلات» لتأكيد الإزالة." });
                }}
                className="rounded-md px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                إزالة
              </button>
            )}
          </div>
          <p className="text-xs text-warmgray-400">{hint}</p>
          {showUrl && (
            <input
              type="url"
              className="input"
              dir="ltr"
              placeholder={isLogo ? "https://example.com/logo.png" : "https://example.com/office.jpg"}
              value={value.startsWith("/api/") ? "" : value}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
          {message && (
            <p role="status" className={`text-xs font-semibold ${message.ok ? "text-green-700" : "text-red-700"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setCropping(file);
          event.target.value = "";
        }}
      />
      {cropping && (
        <ImageCropper
          file={cropping}
          shapes={SHAPES[kind]}
          keepTransparency={isLogo}
          onCancel={() => setCropping(null)}
          onDone={(cropped) => {
            setCropping(null);
            upload(cropped);
          }}
        />
      )}
    </div>
  );
}
