import { BellRing, ClipboardList, FileText, Gavel, History, Hourglass, Landmark, Lock } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { fmtDate, fmtDateTime } from "@/lib/portal";

// Everything shown about a case, used by the case page and the client file.
export const caseSelect = (showNotes: boolean) => ({
  id: true, internalNumber: true, courtNumber: true, title: true, type: true, stage: true, status: true, court: true, chamber: true, judge: true,
  clientRole: true, opposingParties: true, claimValue: true, clientSummary: true, outcome: true,
  lawyers: { select: { name: true } },
  hearings: { orderBy: { date: "desc" }, select: { id: true, date: true, court: true, room: true, purpose: true, outcome: true, nextDate: true } },
  deadlines: { orderBy: { dueDate: "asc" }, select: { id: true, kind: true, dueDate: true, description: true, completed: true } },
  timeline: { orderBy: { eventDate: "desc" }, select: { id: true, title: true, description: true, eventDate: true } },
  documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, folder: true, visibleToClient: true, createdAt: true, storageKey: true } },
  clientUpdates: { orderBy: { createdAt: "desc" }, select: { id: true, body: true, approved: true, sentAt: true, createdAt: true } },
  tasks: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, dueDate: true, assignee: { select: { name: true } } } },
  notes: { orderBy: { createdAt: "desc" }, take: showNotes ? 50 : 0, select: { id: true, body: true, createdAt: true, createdByUser: { select: { name: true } } } },
}) satisfies Prisma.CaseSelect;

type CaseData = Prisma.CaseGetPayload<{ select: ReturnType<typeof caseSelect> }>;

export const ROLE_AR: Record<string, string> = { PLAINTIFF: "مدّعٍ", DEFENDANT: "مدّعى عليه", COMPLAINANT: "مشتكٍ", ACCUSED: "مشتكى عليه", OTHER: "أخرى" };
const PURPOSE_AR: Record<string, string> = { FIRST_SESSION: "جلسة أولى", PLEADINGS: "مرافعة", EVIDENCE: "بيّنات", ARGUMENTS: "مرافعات ختامية", JUDGMENT: "نطق بالحكم", OTHER: "أخرى" };
const DEADLINE_AR: Record<string, string> = { APPEAL: "استئناف", OBJECTION: "اعتراض", DOCUMENT_SUBMISSION: "تقديم مستندات", LIMITATION_PERIOD: "تقادم", OTHER: "أخرى" };
export const FOLDER_AR: Record<string, string> = { PLEADINGS: "لوائح", EVIDENCE: "بيّنات", COURT_DECISIONS: "قرارات المحكمة", CORRESPONDENCE: "مراسلات", IDS: "هويات", OTHER: "أخرى" };
const TASK_AR: Record<string, string> = { TODO: "للتنفيذ", IN_PROGRESS: "قيد التنفيذ", DONE: "منجزة", CANCELLED: "ملغاة" };

const money = (v: { toString(): string } | null) => (v ? `${Number(v.toString()).toLocaleString("en-US")} دينار` : null);

function Block({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f1c36]">
        <span className="text-[#b08d57]">{icon}</span> {title}
        {count !== undefined && <span className="tnum text-xs font-normal text-warmgray-500">({count})</span>}
      </h3>
      {children}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-xs text-warmgray-500">{text}</p>;

export default function CaseDetails({ c }: { c: CaseData }) {
  const now = new Date();
  const parties = Array.isArray(c.opposingParties) ? (c.opposingParties as { name?: string; counsel?: string }[]) : [];
  const outcome = c.outcome && typeof c.outcome === "object" ? Object.values(c.outcome as Record<string, unknown>).map(String) : [];
  return (
<div className="space-y-5">
  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
    {[
      ["المحكمة", [c.court, c.chamber].filter(Boolean).join(" – ")],
      ["القاضي", c.judge],
      ["قيمة المطالبة", money(c.claimValue)],
      ["الخصم", parties.map((p) => [p.name, p.counsel && `(وكيله: ${p.counsel})`].filter(Boolean).join(" ")).join("، ")],
      ["المحامون", c.lawyers.map((l) => l.name).join("، ")],
    ].filter(([, v]) => v).map(([k, v]) => (
      <div key={k as string}><dt className="text-xs text-warmgray-500">{k}</dt><dd className="font-medium">{v}</dd></div>
    ))}
  </dl>

  {c.clientSummary && <Block title="نص القضية ووقائعها" icon={<FileText size={15} />}><p className="whitespace-pre-line rounded-xl bg-[#fbf9f4] p-3 text-sm leading-7">{c.clientSummary}</p></Block>}
  {outcome.length > 0 && <Block title="النتيجة" icon={<Landmark size={15} />}><ul className="space-y-1 rounded-xl bg-[#fbf9f4] p-3 text-sm leading-7">{outcome.map((o) => <li key={o}>{o}</li>)}</ul></Block>}

  <Block title="الجلسات" icon={<Gavel size={15} />} count={c.hearings.length}>
    {c.hearings.length === 0 ? <Empty text="لا توجد جلسات." /> : (
      <ul className="space-y-2">
        {c.hearings.map((h) => (
          <li key={h.id} className={`rounded-xl border p-3 text-sm ${h.date >= now ? "border-[#d4af6a]/60 bg-[#fbf7ee]" : "border-slate-100"}`}>
            <p className="font-semibold">{fmtDateTime(h.date)} · {PURPOSE_AR[h.purpose] ?? h.purpose}{h.date >= now ? " · قادمة" : ""}</p>
            <p className="text-xs text-warmgray-500">{h.court}{h.room ? ` · قاعة ${h.room}` : ""}</p>
            {h.outcome && <p className="mt-1 leading-6">{h.outcome}</p>}
            {h.nextDate && <p className="mt-1 text-xs font-semibold text-[#9a7436]">الجلسة التالية: {fmtDate(h.nextDate)}</p>}
          </li>
        ))}
      </ul>
    )}
  </Block>

  <Block title="المهل" icon={<Hourglass size={15} />} count={c.deadlines.length}>
    {c.deadlines.length === 0 ? <Empty text="لا توجد مهل." /> : (
      <ul className="space-y-1.5 text-sm">
        {c.deadlines.map((d) => {
          const late = !d.completed && d.dueDate < now;
          return (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[#fbf9f4] px-3 py-2">
              <span>{DEADLINE_AR[d.kind] ?? d.kind}: {d.description}</span>
              <span className={`text-xs font-semibold ${late ? "text-red-700" : d.completed ? "text-emerald-700" : "text-amber-700"}`}>{fmtDate(d.dueDate)}{late ? " · متأخرة" : d.completed ? " · منجزة" : ""}</span>
            </li>
          );
        })}
      </ul>
    )}
  </Block>

  <Block title="المستندات والملفات" icon={<FileText size={15} />} count={c.documents.length}>
    {c.documents.length === 0 ? <Empty text="لا توجد مستندات." /> : (
      <ul className="space-y-1.5 text-sm">
        {c.documents.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fbf9f4] px-3 py-2">
            {d.storageKey.startsWith("asset:") ? <a href={`/api/documents/${d.id}`} className="font-medium text-[#9a7436] hover:underline">{d.title}</a> : <span className="font-medium">{d.title}</span>}
            <span className="text-xs text-warmgray-500">{FOLDER_AR[d.folder] ?? d.folder} · {fmtDate(d.createdAt)} · {d.visibleToClient ? "مشترك مع العميل" : "داخلي"}</span>
          </li>
        ))}
      </ul>
    )}
  </Block>

  <Block title="مسار القضية" icon={<History size={15} />} count={c.timeline.length}>
    {c.timeline.length === 0 ? <Empty text="لا توجد أحداث." /> : (
      <ul className="space-y-1.5 text-sm">
        {c.timeline.map((e) => <li key={e.id}><span className="text-xs text-warmgray-500">{fmtDate(e.eventDate)}</span> — {e.title}{e.description ? `: ${e.description}` : ""}</li>)}
      </ul>
    )}
  </Block>

  {c.tasks.length > 0 && (
    <Block title="المهام" icon={<ClipboardList size={15} />} count={c.tasks.length}>
      <ul className="space-y-1.5 text-sm">
        {c.tasks.map((t) => <li key={t.id}>{t.title} <span className="text-xs text-warmgray-500">· {TASK_AR[t.status] ?? t.status}{t.dueDate ? ` · ${fmtDate(t.dueDate)}` : ""}{t.assignee ? ` · ${t.assignee.name}` : ""}</span></li>)}
      </ul>
    </Block>
  )}

  {c.clientUpdates.length > 0 && (
    <Block title="التحديثات للعميل" icon={<BellRing size={15} />} count={c.clientUpdates.length}>
      <ul className="space-y-1.5 text-sm">
        {c.clientUpdates.map((u) => <li key={u.id} className="rounded-lg bg-[#fbf9f4] px-3 py-2 leading-6">{u.body}<span className="block text-xs text-warmgray-500">{u.approved ? "معتمد" : "بانتظار الاعتماد"}{u.sentAt ? ` · أُرسل ${fmtDate(u.sentAt)}` : ""}</span></li>)}
      </ul>
    </Block>
  )}

  {c.notes.length > 0 && (
    <Block title="ملاحظات داخلية (لا تظهر للعميل)" icon={<Lock size={15} />} count={c.notes.length}>
      <ul className="space-y-1.5 text-sm">
        {c.notes.map((n) => <li key={n.id} className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 leading-6">{n.body}<span className="block text-xs text-warmgray-500">{n.createdByUser.name} · {fmtDate(n.createdAt)}</span></li>)}
      </ul>
    </Block>
  )}
</div>
  );
}
