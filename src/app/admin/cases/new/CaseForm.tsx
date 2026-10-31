"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, X } from "lucide-react";
import { normalizeArabic } from "@/lib/ai/arabic";
import { STAGES, TYPE_AR } from "@/lib/portal";
import { ROLE_AR } from "../CaseDetails";

type ClientOption = { id: string; name: string; mobile: string };

const empty = {
  title: "", internalNumber: "", courtNumber: "", type: "CIVIL", stage: "FIRST_INSTANCE", clientRole: "PLAINTIFF",
  court: "", chamber: "", judge: "", opposingName: "", opposingCounsel: "", claimValue: "", summary: "",
};

function ClientPicker({ clients, value, onChange, onNew }: { clients: ClientOption[]; value: string; onChange: (id: string) => void; onNew: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = clients.find((c) => c.id === value);

  const shown = useMemo(() => {
    const terms = normalizeArabic(query).split(/\s+/).filter(Boolean);
    return clients.filter((c) => {
      const haystack = normalizeArabic(`${c.name} ${c.mobile}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [clients, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          id="case-client"
          className="input pl-9"
          autoComplete="off"
          placeholder="اضغط لعرض العملاء أو ابحث بالاسم أو الجوال"
          value={open ? query : selected ? `${selected.name} — ${selected.mobile}` : ""}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onClick={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-warmgray-500" />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { onChange(c.id); setOpen(false); }} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm hover:bg-[#fbf7ee]">
                <span className="font-semibold">{c.name}</span>
                <span dir="ltr" className="tnum text-xs text-[#0f1c36]/60">{c.mobile}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-3 text-sm text-warmgray-500">{clients.length ? "لا يوجد عميل مطابق." : "لا يوجد عملاء بعد."}</li>}
          <li className="border-t border-slate-100">
            <button type="button" onClick={() => { setOpen(false); onNew(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#9a7436] hover:bg-[#fbf7ee]">
              <Plus size={15} /> عميل جديد
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export default function CaseForm({ clients, initialClient }: { clients: ClientOption[]; initialClient?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [clientId, setClientId] = useState(clients.some((c) => c.id === initialClient) ? initialClient! : "");
  const [newClient, setNewClient] = useState<{ name: string; mobile: string; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const field = (k: keyof typeof empty, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`case-${k}`} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input id={`case-${k}`} className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );
  const select = (k: keyof typeof empty, label: string, options: [string, string][]) => (
    <div>
      <label htmlFor={`case-${k}`} className="mb-1.5 block text-sm font-semibold">{label} *</label>
      <select id={`case-${k}`} className="input" value={form[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId && !newClient) { setError("اختر صاحب القضية."); return; }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          claimValue: form.claimValue ? Number(form.claimValue) : null,
          ...(newClient ? { newClient } : { clientId }),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر حفظ القضية.");
        return;
      }
      router.push(`/admin/cases/${result.id}`);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <section className="card space-y-4">
        <h2 className="font-bold">صاحب القضية</h2>
        {newClient ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">عميل جديد</p>
              <button type="button" onClick={() => setNewClient(null)} className="inline-flex items-center gap-1 text-xs text-warmgray-500 hover:text-[#9a7436]"><X size={14} /> اختيار عميل موجود</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-name" className="mb-1.5 block text-sm font-semibold">الاسم الكامل *</label>
                <input id="new-name" required className="input" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="new-mobile" className="mb-1.5 block text-sm font-semibold">الجوال *</label>
                <input id="new-mobile" required dir="ltr" className="input" value={newClient.mobile} onChange={(e) => setNewClient({ ...newClient, mobile: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="new-email" className="mb-1.5 block text-sm font-semibold">البريد الإلكتروني</label>
                <input id="new-email" type="email" dir="ltr" className="input" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="case-client" className="mb-1.5 block text-sm font-semibold">اسم صاحب القضية *</label>
            <ClientPicker clients={clients} value={clientId} onChange={setClientId} onNew={() => { setClientId(""); setNewClient({ name: "", mobile: "", email: "" }); }} />
          </div>
        )}
        {select("clientRole", "صفته في القضية", Object.entries(ROLE_AR))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">بيانات القضية</h2>
        {field("title", "عنوان القضية *", { required: true, placeholder: "مثال: مطالبة عمالية ضد شركة الأفق" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("internalNumber", "رقم القضية في المكتب", { placeholder: "يُولَّد تلقائيًا إن تركته فارغًا", dir: "ltr" })}
          {field("courtNumber", "رقم الدعوى في المحكمة", { dir: "ltr" })}
          {select("type", "نوع القضية", Object.entries(TYPE_AR))}
          {select("stage", "المرحلة", STAGES as unknown as [string, string][])}
          {field("court", "المحكمة")}
          {field("chamber", "الهيئة / الغرفة")}
          {field("judge", "القاضي")}
          {field("claimValue", "قيمة الدعوى (دينار)", { type: "number", min: 0, step: "0.01", dir: "ltr" })}
          {field("opposingName", "الخصم")}
          {field("opposingCounsel", "وكيل الخصم")}
        </div>
      </section>

      <section className="card space-y-2">
        <label htmlFor="case-summary" className="block font-bold">نص القضية ووقائعها *</label>
        <textarea id="case-summary" required rows={10} className="input leading-7" placeholder="اكتب الوقائع والطلبات والتواريخ المهمة…" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? "جارٍ الحفظ…" : "حفظ القضية"}</button>
    </form>
  );
}
