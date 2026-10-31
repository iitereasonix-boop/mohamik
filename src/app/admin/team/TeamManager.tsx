"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = [
  { value: "SECRETARY", label: "سكرتير/سكرتيرة", hint: "يرى المواعيد فقط: يوافق على طلبات العملاء أو يرفضها ويسجّل حضورها." },
  { value: "LAWYER", label: "محامٍ", hint: "القضايا والعملاء والطلبات والمواعيد." },
  { value: "TRAINEE", label: "محامٍ متدرب", hint: "القضايا والعملاء والطلبات والمواعيد، دون إغلاق القضايا أو توزيعها." },
];

export function AddMemberForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", role: "SECRETARY", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر إنشاء الحساب.");
        return;
      }
      setCreated(`${form.name} — ${form.email}`);
      setForm({ name: "", email: "", mobile: "", role: form.role, password: "" });
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  const hint = ROLE_OPTIONS.find((r) => r.value === form.role)?.hint;

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">إضافة عضو للفريق</h2>
        <p className="mt-1 text-sm text-warmgray-500">أنشئ حسابًا لسكرتيرة أو محامٍ، ثم سلّمه البريد وكلمة المرور ليدخل من صفحة الدخول باسم نطاق مكتبك.</p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">الدور</label>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => set("role", r.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${form.role === r.value ? "bg-[#0f1c36] text-[#f1dfb3]" : "border border-slate-200 bg-white text-slate-600 hover:border-[#b08d57]"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {hint && <p className="mt-2 text-xs text-warmgray-500">{hint}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="m-name" className="mb-1 block text-sm font-semibold">الاسم الكامل</label>
          <input id="m-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor="m-mobile" className="mb-1 block text-sm font-semibold">الجوال (اختياري)</label>
          <input id="m-mobile" className="input tnum" dir="ltr" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
        </div>
        <div>
          <label htmlFor="m-email" className="mb-1 block text-sm font-semibold">البريد الإلكتروني</label>
          <input id="m-email" type="email" className="input" dir="ltr" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label htmlFor="m-pass" className="mb-1 block text-sm font-semibold">كلمة المرور (10 أحرف على الأقل)</label>
          <input id="m-pass" type="text" className="input" dir="ltr" required minLength={10} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {created && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">تم إنشاء الحساب: {created}</p>}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</button>
    </form>
  );
}

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const result = await response?.json().catch(() => null);
      setError(result?.error ?? "تعذّر التحديث.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={busy} onClick={toggle} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${active ? "border border-red-200 text-red-700 hover:bg-red-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
        {busy ? "..." : active ? "تعطيل" : "تفعيل"}
      </button>
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </span>
  );
}
