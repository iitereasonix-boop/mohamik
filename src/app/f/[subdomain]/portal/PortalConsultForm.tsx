"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CASE_TYPES = [
  { value: "", label: "اختر نوع القضية" },
  { value: "PRE_LITIGATION", label: "استشارة قبل التقاضي" },
  { value: "LABOUR", label: "قضية عمالية" },
  { value: "CIVIL", label: "قضية مدنية" },
  { value: "CRIMINAL", label: "قضية جنائية" },
  { value: "REAL_ESTATE", label: "قضية عقارية" },
  { value: "OTHER", label: "أخرى" },
];

/**
 * Portal consultation form – submits a request to the firm's intake inbox.
 * Tenant-scoped by subdomain; the firm sees it in its intake inbox only.
 */
export default function PortalConsultForm({
  subdomain,
  defaults,
}: {
  subdomain: string;
  defaults?: { name?: string; mobile?: string; email?: string | null };
}) {
  const [form, setForm] = useState({
    name: defaults?.name ?? "",
    mobile: defaults?.mobile ?? "",
    email: defaults?.email ?? "",
    caseType: "",
    subject: "",
    details: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/f/${subdomain}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setErrors(d?.error ? [d.error] : ["خطأ غير متوقع."]);
        return;
      }
      router.push(`/f/${subdomain}/portal/success`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-burgundy-600";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">الاسم</label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">رقم الهاتف</label>
          <input
            className={inputCls}
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">نوع القضية</label>
        <select
          className={inputCls}
          value={form.caseType}
          onChange={(e) => set("caseType", e.target.value)}
          required
        >
          {CASE_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الموضوع</label>
        <input
          className={inputCls}
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">التفاصيل</label>
        <textarea
          className={inputCls}
          rows={5}
          value={form.details}
          onChange={(e) => set("details", e.target.value)}
          required
        />
      </div>

      {errors.length > 0 && (
        <div className="rounded border border-burgundy-600 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-600">
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-burgundy-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        إرسال الطلب
      </button>
    </form>
  );
}
