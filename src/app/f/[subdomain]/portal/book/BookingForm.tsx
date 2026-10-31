"use client";

import { useState } from "react";
import { AppointmentKind } from "@prisma/client";

const MODE_LABELS: Record<string, string> = {
  IN_OFFICE: "في المكتب",
  PHONE: "هاتفي",
  VIDEO: "مرئي",
};

type Defaults = { name?: string; mobile?: string; email?: string | null };

export default function BookingForm({
  subdomain,
  defaults,
}: {
  subdomain: string;
  defaults?: Defaults;
}) {
  const [name, setName] = useState(defaults?.name ?? "");
  const [mobile, setMobile] = useState(defaults?.mobile ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [kind, setKind] = useState<AppointmentKind>("IN_OFFICE");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/f/${subdomain}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile, email, kind, date, notes }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "تعذّر الحجز.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">✓</span>
        <p className="mt-5 font-arabic-heading text-2xl font-bold">تم إرسال طلب الموعد</p>
        <p className="mt-2 text-sm text-[#0f1c36]/60">
          سيراجع المكتب طلبك ويؤكد الموعد معك. يظهر الموعد في صفحتك الرئيسية بعد تسجيل الدخول.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold">الاسم الكامل</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">رقم الجوال</label>
          <input
            className="input tnum"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+962 7 ..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold">البريد الإلكتروني (اختياري)</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">نوع الموعد</label>
        <div className="flex gap-2">
          {(["IN_OFFICE", "PHONE", "VIDEO"] as AppointmentKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${kind === k ? "bg-burgundy" : "border border-[#e2d8c5] bg-white text-[#0f1c36]/60 hover:border-[#b08d57]"
                }`}
            >
              {MODE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">التاريخ المفضل</label>
        <input type="date" className="input tnum" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">ملاحظات (اختياري)</label>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "جارٍ الحجز..." : "حجز الموعد"}
      </button>
    </form>
  );
}
