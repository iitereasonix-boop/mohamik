"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus, X } from "lucide-react";
import { FOLDER_AR } from "../CaseDetails";

const today = () => new Date().toISOString().slice(0, 10);

export default function CaseUpdateForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [folder, setFolder] = useState("OTHER");
  const [share, setShare] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("title", title);
    body.set("description", description);
    body.set("date", date);
    body.set("folder", folder);
    body.set("visibleToClient", String(share));
    files.forEach((f) => body.append("files", f));
    try {
      const response = await fetch(`/api/admin/cases/${caseId}/updates`, { method: "POST", body });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر حفظ المستجد.");
        return;
      }
      setTitle("");
      setDescription("");
      setDate(today());
      setShare(false);
      setFiles([]);
      setOpen(false);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-5 inline-flex items-center gap-2">
        <Plus size={16} /> إضافة مستجد أو ملف
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">شو صار في القضية؟</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="text-warmgray-500 hover:text-[#9a7436]"><X size={18} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label htmlFor="update-title" className="mb-1.5 block text-sm font-semibold">العنوان *</label>
          <input id="update-title" required className="input" placeholder="مثال: صدور قرار تأجيل الجلسة" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="update-date" className="mb-1.5 block text-sm font-semibold">التاريخ *</label>
          <input id="update-date" required type="date" dir="ltr" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="update-description" className="mb-1.5 block text-sm font-semibold">التفاصيل</label>
        <textarea id="update-description" rows={5} className="input leading-7" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <input ref={picker} type="file" multiple hidden accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" onChange={(e) => { const picked = Array.from(e.target.files ?? []); setFiles((f) => [...f, ...picked].slice(0, 5)); e.target.value = ""; }} />
        <button type="button" onClick={() => picker.current?.click()} className="btn-secondary inline-flex items-center gap-2"><Paperclip size={15} /> إرفاق ملفات</button>
        <p className="mt-1.5 text-xs text-warmgray-500">حتى 5 ملفات، 15 ميغابايت لكل ملف: PDF أو Word أو صور أو نص.</p>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#fbf9f4] px-3 py-2">
                <span className="min-w-0 truncate">{f.name}</span>
                <button type="button" aria-label={`إزالة ${f.name}`} onClick={() => setFiles((all) => all.filter((_, n) => n !== i))} className="text-warmgray-500 hover:text-rose-600"><X size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {files.length > 0 && (
        <div>
          <label htmlFor="update-folder" className="mb-1.5 block text-sm font-semibold">تصنيف الملفات</label>
          <select id="update-folder" className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
            {Object.entries(FOLDER_AR).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={share} onChange={(e) => setShare(e.target.checked)} />
        <span>إظهار هذا المستجد وملفاته للعميل في بوابته. بدون هذا الخيار يبقى داخليًا للمكتب.</span>
      </label>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "جارٍ الحفظ…" : "حفظ المستجد"}</button>
    </form>
  );
}
