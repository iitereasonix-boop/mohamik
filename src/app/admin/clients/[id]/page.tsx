import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, CalendarClock, FileText, Gavel, Lock, Mail, MessageSquare, Phone, UserCheck,
} from "lucide-react";
import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { APPT_KIND_AR, APPT_STATUS_AR, STAGE_AR, STATUS_AR, TYPE_AR, fmtDate, fmtDateTime, statusTone } from "@/lib/portal";
import { withTenant } from "@/lib/tenant";
import CaseDetails, { ROLE_AR, caseSelect } from "@/app/admin/cases/CaseDetails";

export const dynamic = "force-dynamic";

const CONSULT_AR: Record<string, string> = { NEW: "جديد", UNDER_REVIEW: "قيد المراجعة", ACCEPTED: "مقبول", DECLINED: "مرفوض" };

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><span className="text-[#b08d57]">{icon}</span> {title}</h2>
      {children}
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-xs text-warmgray-500">{text}</p>;

export default async function AdminClientFilePage({ params }: { params: { id: string } }) {
  const ctx = await guardSection("clients");
  const tenantId = ctx.tenantId;
  const showNotes = can(ctx.role, "note.confidential.view");

  const client = await withTenant(tenantId, (tx) => tx.client.findFirst({
    where: { id: params.id, tenantId },
    select: {
      name: true, mobile: true, email: true, source: true, notes: true, createdAt: true, consentAt: true, userId: true,
      cases: {
        orderBy: { updatedAt: "desc" },
        select: caseSelect(showNotes),
      },
      appointments: { orderBy: { startAt: "desc" }, select: { id: true, startAt: true, kind: true, status: true, notes: true } },
      consultRequests: { orderBy: { createdAt: "desc" }, select: { id: true, subject: true, details: true, status: true, createdAt: true } },
      documents: { where: { caseId: null }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, folder: true, createdAt: true } },
    },
  }));
  if (!client) notFound();

  const now = new Date();
  const active = client.cases.filter((c) => c.status === "ACTIVE").length;
  const nextHearing = client.cases.flatMap((c) => c.hearings).filter((h) => h.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-warmgray-500 hover:text-[#9a7436]"><ArrowRight size={15} /> كل العملاء</Link>

      <header className="mt-3 rounded-3xl bg-[#0f1c36] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="bg-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-arabic-heading text-2xl font-bold">{client.name.trim().charAt(0)}</span>
            <div>
              <h1 className="font-arabic-heading text-3xl font-bold">{client.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
                <a href={`tel:${client.mobile}`} className="inline-flex items-center gap-1.5 hover:text-[#f1dfb3]"><Phone size={14} /> <span dir="ltr">{client.mobile}</span></a>
                {client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-[#f1dfb3]"><Mail size={14} /> <span dir="ltr">{client.email}</span></a>}
                <span className="inline-flex items-center gap-1.5"><UserCheck size={14} /> {client.userId ? "لديه حساب في البوابة" : "بدون حساب في البوابة"}</span>
              </div>
              <p className="mt-1 text-xs text-white/50">عميل منذ {fmtDate(client.createdAt)}{client.source ? ` · ${client.source}` : ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["كل القضايا", client.cases.length], ["نشطة", active], ["مواعيد", client.appointments.length]].map(([label, value]) => (
              <div key={label as string} className="min-w-[76px] rounded-xl bg-white/[0.06] px-3 py-2">
                <p className="tnum text-xl font-bold text-[#f1dfb3]">{value as number}</p>
                <p className="text-[11px] text-white/60">{label as string}</p>
              </div>
            ))}
          </div>
        </div>
        {nextHearing && <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d4af6a]/15 px-4 py-1.5 text-sm text-[#f1dfb3]"><Gavel size={15} /> الجلسة القادمة: {fmtDateTime(nextHearing.date)} · {nextHearing.court}</p>}
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-4">
          <h2 className="text-lg font-bold">القضايا ({client.cases.length})</h2>
          {client.cases.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-warmgray-500">لا توجد قضايا لهذا العميل.</p>}
          {client.cases.map((c, i) => {
            return (
              <details key={c.id} open={i === 0} className="group rounded-2xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                  <span className="min-w-0">
                    <span className="tnum block text-xs text-warmgray-500">{c.internalNumber}{c.courtNumber ? ` · ${c.courtNumber}` : ""}</span>
                    <span className="mt-0.5 block font-bold">{c.title}</span>
                    <span className="mt-1 block text-xs text-warmgray-500">{TYPE_AR[c.type] ?? c.type} · {STAGE_AR[c.stage] ?? c.stage} · {ROLE_AR[c.clientRole] ?? c.clientRole}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(c.status)}`}>{STATUS_AR[c.status] ?? c.status}</span>
                </summary>

                <div className="border-t border-slate-100 p-5"><CaseDetails c={c} /><Link href={`/admin/cases/${c.id}`} className="mt-5 inline-block text-sm font-semibold text-[#9a7436] hover:underline">فتح صفحة القضية</Link></div>
              </details>
            );
          })}
        </div>

        <aside className="space-y-4">
          {showNotes && client.notes && (
            <Panel title="ملاحظات عن العميل" icon={<Lock size={16} />}><p className="whitespace-pre-line text-sm leading-7">{client.notes}</p></Panel>
          )}
          <Panel title="المواعيد" icon={<CalendarClock size={16} />}>
            {client.appointments.length === 0 ? <Empty text="لا توجد مواعيد." /> : (
              <ul className="space-y-2 text-sm">
                {client.appointments.map((a) => (
                  <li key={a.id} className="rounded-lg bg-[#fbf9f4] px-3 py-2">
                    <p className="font-semibold">{fmtDateTime(a.startAt)}</p>
                    <p className="text-xs text-warmgray-500">{APPT_KIND_AR[a.kind] ?? a.kind} · {APPT_STATUS_AR[a.status] ?? a.status}</p>
                    {a.notes && <p className="mt-1 text-xs leading-5">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="طلبات الاستشارة" icon={<MessageSquare size={16} />}>
            {client.consultRequests.length === 0 ? <Empty text="لا توجد طلبات." /> : (
              <ul className="space-y-2 text-sm">
                {client.consultRequests.map((r) => (
                  <li key={r.id} className="rounded-lg bg-[#fbf9f4] px-3 py-2">
                    <p className="font-semibold">{r.subject}</p>
                    <p className="text-xs text-warmgray-500">{CONSULT_AR[r.status] ?? r.status} · {fmtDate(r.createdAt)}</p>
                    <p className="mt-1 text-xs leading-5">{r.details}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {client.documents.length > 0 && (
            <Panel title="مستندات عامة" icon={<FileText size={16} />}>
              <ul className="space-y-1.5 text-sm">{client.documents.map((d) => <li key={d.id}>{d.title} <span className="text-xs text-warmgray-500">· {fmtDate(d.createdAt)}</span></li>)}</ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
