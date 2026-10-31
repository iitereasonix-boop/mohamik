"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Law = { id: string; category: string; title: string; number: number | null; year: number | null; sourceUrl: string | null; articleCount: number; content: string };
const EMPTY = { id: "", category: "", title: "", number: "", year: "", sourceUrl: "", content: "" };

export default function LawsManager({ laws }: { laws: Law[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function edit(l: Law) {
    setForm({ id: l.id, category: l.category, title: l.title, number: l.number?.toString() ?? "", year: l.year?.toString() ?? "", sourceUrl: l.sourceUrl ?? "", content: l.content });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const r = await fetch("/api/platform/laws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: form.id || undefined, number: form.number ? Number(form.number) : null, year: form.year ? Number(form.year) : null }),
    }).catch(() => null);
    const result = await r?.json().catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMessage({ ok: false, text: result?.error ?? "تعذّر الحفظ." });
    setMessage({ ok: true, text: `تم الحفظ: ${result.articles} مادة.` });
    setForm(EMPTY);
    router.refresh();
  }

  async function remove(l: Law) {
    if (!confirm(`حذف «${l.title}»؟`)) return;
    const r = await fetch(`/api/platform/laws?id=${l.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="text-lg font-bold">{form.id ? `تعديل: ${form.title}` : "إضافة قانون"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" required placeholder="اسم القانون" value={form.title} onChange={(e) => set("title", e.target.value)} />
          <input className="input" required placeholder="التصنيف (مثل: العمل)" value={form.category} onChange={(e) => set("category", e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="رقم القانون" value={form.number} onChange={(e) => set("number", e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="السنة" value={form.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <input className="input" dir="ltr" placeholder="https:// رابط المصدر الرسمي" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
        <textarea className="input" rows={10} placeholder={"الصق النص الرسمي كاملًا. كل سطر يبدأ بـ «المادة» ورقم يُحفظ كمادة مستقلة."} value={form.content} onChange={(e) => set("content", e.target.value)} />
        {message && <p role="status" className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? "جارٍ الحفظ…" : "حفظ"}</button>
          {form.id && <button type="button" onClick={() => setForm(EMPTY)} className="btn-secondary">إلغاء</button>}
        </div>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-paper-100 text-xs text-warmgray-500">
            <tr><th className="px-4 py-2 text-right">القانون</th><th className="px-4 py-2 text-right">التصنيف</th><th className="px-4 py-2 text-right">المواد</th><th /></tr>
          </thead>
          <tbody>
            {laws.map((l) => (
              <tr key={l.id} className="border-t border-paper-200">
                <td className="px-4 py-2 font-semibold">{l.title}{l.number && l.year ? ` (${l.number}/${l.year})` : ""}</td>
                <td className="px-4 py-2">{l.category}</td>
                <td className="px-4 py-2 tnum">{l.articleCount || "النص قيد الإضافة"}</td>
                <td className="whitespace-nowrap px-4 py-2 text-left">
                  <button type="button" onClick={() => edit(l)} className="font-semibold underline">تعديل</button>
                  <button type="button" onClick={() => remove(l)} className="mr-3 text-red-700">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
