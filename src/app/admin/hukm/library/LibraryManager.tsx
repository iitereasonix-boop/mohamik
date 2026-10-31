"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Database, FileText, Gavel, Landmark, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";

type Doc = { id: string; kind: string; title: string; reference: string | null; chunkCount: number; createdAt: string };
type Preview = { title: string; reference: string | null; chunks: { idx: number; heading: string | null; text: string }[] };

const KINDS = [
  { value: "LAW", label: "قانون / تشريع", hint: "مثل قانون العمل أو أصول المحاكمات. يُقسَّم تلقائيًا إلى مواد.", icon: Landmark },
  { value: "PRECEDENT", label: "حكم / سابقة قضائية", hint: "قرارات محكمة التمييز أو أحكام سابقة يستفيد منها المكتب.", icon: Gavel },
  { value: "REFERENCE", label: "مرجع داخلي", hint: "مذكرات المكتب، نماذج، أو شروحات يعتمدها الفريق.", icon: FileText },
] as const;
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

export default function LibraryManager({ docs, canEdit, stats }: { docs: Doc[]; canEdit: boolean; stats: { clients: number; cases: number; closed: number } }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "LAW", title: "", reference: "", content: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const shown = useMemo(
    () => docs.filter((d) => (!kind || d.kind === kind) && (!filter || `${d.title} ${d.reference ?? ""}`.includes(filter.trim()))),
    [docs, filter, kind]
  );

  async function readFile(file: File) {
    if (file.size > 6 * 1024 * 1024) return setError("الملف أكبر من 6 ميغابايت.");
    if (!/\.(txt|md|text)$/i.test(file.name) && !file.type.startsWith("text/")) {
      return setError("ارفع ملفًا نصيًا (.txt). لملفات Word أو PDF: انسخ النص والصقه في الخانة.");
    }
    const text = await file.text();
    setForm((f) => ({ ...f, content: text, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/hukm/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await r.json().catch(() => null);
      if (!r.ok) return setError(result?.error ?? "تعذّر الحفظ.");
      setNotice(
        result.articles >= 2
          ? `أُضيف «${form.title}» وقُسِّم إلى ${result.articles} مادة. أصبح «حُكم» يستشهد بها.`
          : `أُضيف «${form.title}» (${result.chunks} مقطع). أصبح «حُكم» يستفيد منه.`
      );
      setForm({ kind: form.kind, title: "", reference: "", content: "" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: Doc) {
    if (!confirm(`حذف «${d.title}» من المكتبة؟ لن يستطيع «حُكم» الاستشهاد به بعد الآن.`)) return;
    const r = await fetch(`/api/hukm/library/${d.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) router.refresh();
  }

  async function show(d: Doc) {
    const r = await fetch(`/api/hukm/library/${d.id}`).catch(() => null);
    if (r?.ok) setPreview((await r.json()).doc);
  }

  const kindHint = KINDS.find((k) => k.value === form.kind)?.hint;

  return (
    <div className="space-y-5">
      {/* two sources of knowledge */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Database size={20} /></span>
            <div>
              <p className="font-bold text-[#0f1c36]">بيانات المكتب — تلقائيًا</p>
              <p className="text-xs text-[#0f1c36]/55">لا تحتاج أي إدخال</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#0f1c36]/65">
            «حُكم» يقرأ مباشرة ملفات <b className="tnum">{stats.clients}</b> عميل و<b className="tnum">{stats.cases}</b> قضية (منها <b className="tnum">{stats.closed}</b> مغلقة يتعلّم من نتائجها)، مع الجلسات والمواعيد والمهل والتحديثات، وتتحدّث معلوماته لحظة بلحظة مع كل تعديل.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-[#0f1c36] p-6 text-white">
          <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="relative flex items-center gap-3">
            <span className="bg-gold flex h-11 w-11 items-center justify-center rounded-xl"><BookOpen size={20} /></span>
            <div>
              <p className="font-bold">المكتبة القانونية — من إضافتك</p>
              <p className="text-xs text-white/55">{docs.length} مستند</p>
            </div>
          </div>
          <p className="relative mt-4 text-sm leading-7 text-white/70">
            القوانين والأحكام والمراجع التي تضيفها هنا هي المصدر الوحيد الذي يستشهد منه «حُكم» بالنصوص القانونية، بنصّها الحرفي ومع رقم المادة.
          </p>
        </div>
      </div>

      {notice && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {/* toolbar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-4 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#0f1c36]/[0.1] px-3">
          <Search size={16} className="text-[#b08d57]" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث في عناوين المكتبة…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-[#0f1c36]/[0.1] bg-white px-3 py-2.5 text-sm outline-none">
          <option value="">كل الأنواع</option>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        {canEdit && (
          <button type="button" onClick={() => { setOpen(true); setNotice(null); }} className="bg-gold flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold">
            <Plus size={17} /> إضافة إلى المكتبة
          </button>
        )}
      </div>

      {/* add form */}
      {open && (
        <form onSubmit={submit} className="space-y-4 rounded-3xl border-2 border-[#d4af6a]/40 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0f1c36]">إضافة مستند إلى المكتبة</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 text-[#0f1c36]/40 hover:bg-[#f7f4ee]"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, kind: value }))}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${form.kind === value ? "bg-[#0f1c36] text-[#f1dfb3]" : "border border-[#0f1c36]/[0.12] text-[#0f1c36]/65 hover:border-[#b08d57]"}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {kindHint && <p className="text-xs text-[#0f1c36]/55">{kindHint}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">العنوان</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="قانون العمل الأردني" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">المرجع الرسمي (اختياري)</label>
              <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="قانون رقم 8 لسنة 1996 وتعديلاته" />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-semibold">النص الكامل</label>
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs font-semibold text-[#9a7436] hover:underline">
                <Upload size={13} /> رفع ملف نصي (.txt)
              </button>
            </div>
            <textarea className="input font-arabic-heading text-[15px] leading-8" rows={12} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={"الصق نص القانون هنا كما هو، مع عناوين المواد، مثل:\nالمادة 1\nيسمى هذا القانون ...\nالمادة 2\n..."} />
            <p className="mt-1 text-xs text-[#0f1c36]/45">
              <span className="tnum">{form.content.length.toLocaleString("ar-JO")}</span> حرف · كل سطر يبدأ بـ «المادة» ورقم يُحفظ كمادة مستقلة ليستشهد بها «حُكم» برقمها.
            </p>
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy && <Loader2 size={15} className="animate-spin" />} {busy ? "جارٍ الحفظ والفهرسة…" : "حفظ في المكتبة"}
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
        </form>
      )}

      {/* documents */}
      {shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#0f1c36]/15 bg-white px-6 py-14 text-center">
          <BookOpen size={30} className="mx-auto text-[#b08d57]" />
          <p className="mt-3 font-bold text-[#0f1c36]">{docs.length ? "لا توجد نتائج مطابقة" : "المكتبة فارغة"}</p>
          <p className="mt-1 text-sm text-[#0f1c36]/55">{docs.length ? "غيّر البحث أو النوع." : "ابدأ بإضافة القوانين التي يعمل بها مكتبك، مثل قانون العمل وأصول المحاكمات المدنية."}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((d) => {
            const K = KINDS.find((k) => k.value === d.kind)?.icon ?? FileText;
            return (
              <div key={d.id} className="flex items-start gap-4 rounded-2xl border border-[#0f1c36]/[0.08] bg-white p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#9a7436]"><K size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#0f1c36]">{d.title}</p>
                  <p className="truncate text-xs text-[#0f1c36]/55">{d.reference || KIND_LABEL[d.kind]}</p>
                  <p className="mt-1 text-[11px] text-[#0f1c36]/45">{KIND_LABEL[d.kind]} · <span className="tnum">{d.chunkCount}</span> {d.kind === "LAW" ? "مادة/مقطع" : "مقطع"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => show(d)} className="rounded-lg border border-[#0f1c36]/[0.12] px-3 py-1.5 text-xs font-semibold hover:border-[#b08d57]">عرض النص</button>
                    {canEdit && (
                      <button type="button" onClick={() => remove(d)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={13} /> حذف</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* preview */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#0f1c36]/[0.08] px-6 py-4">
              <div className="min-w-0">
                <p className="truncate font-bold text-[#0f1c36]">{preview.title}</p>
                {preview.reference && <p className="truncate text-xs text-[#0f1c36]/55">{preview.reference}</p>}
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="إغلاق" className="rounded-lg p-1.5 text-[#0f1c36]/40 hover:bg-[#f7f4ee]"><X size={18} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto px-6 py-5">
              {preview.chunks.map((c) => (
                <div key={c.idx} className="rounded-xl bg-[#fbf9f4] px-4 py-3">
                  {c.heading && <p className="mb-1 text-xs font-bold text-[#9a7436]">{c.heading}</p>}
                  <p className="whitespace-pre-line font-arabic-heading text-[15px] leading-8 text-[#1f2a40]">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
