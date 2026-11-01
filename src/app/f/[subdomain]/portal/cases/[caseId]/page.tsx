import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BellRing, Check, FileText, Gavel, History, Landmark } from "lucide-react";
import { withTenant } from "@/lib/tenant";
import { STAGES, STATUS_AR, TYPE_AR, fmtDate, fmtDateTime, getPortal, statusTone } from "@/lib/portal";
import { Chip, Empty, LoginRequired, Panel } from "@/components/portal/ui";

const ROLE_AR: Record<string, string> = {
  PLAINTIFF: "مدّعٍ", DEFENDANT: "مدّعى عليه", COMPLAINANT: "مشتكٍ", ACCUSED: "مشتكى عليه", OTHER: "أخرى",
};

export default async function PortalCaseDetailPage({ params }: { params: { subdomain: string; caseId: string } }) {
  const { firm, client } = await getPortal(params.subdomain);
  if (!client) return <LoginRequired subdomain={firm.subdomain} what="تفاصيل القضية" />;

  // ownership check: the case must belong to THIS client within THIS firm
  const kase = await withTenant(firm.id, (tx) =>
    tx.case.findFirst({
      where: { id: params.caseId, clientId: client.id, tenantId: firm.id },
      select: {
        internalNumber: true,
        title: true,
        type: true,
        stage: true,
        status: true,
        court: true,
        clientRole: true,
        hearings: {
          where: { visibleToClient: true },
          orderBy: { date: "desc" },
          take: 10,
          select: { id: true, date: true, court: true, room: true, outcome: true, nextDate: true },
        },
        documents: {
          where: { visibleToClient: true },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, mimeType: true, createdAt: true, storageKey: true },
        },
        clientUpdates: {
          where: { approved: true },
          orderBy: { sentAt: "desc" },
          take: 10,
          select: { id: true, body: true, sentAt: true },
        },
        timeline: {
          where: { visibleToClient: true },
          orderBy: { eventDate: "desc" },
          take: 10,
          select: { id: true, title: true, description: true, eventDate: true },
        },
      },
    })
  );
  if (!kase) notFound();

  const base = `/f/${firm.subdomain}/portal`;
  const stageIndex = STAGES.findIndex(([key]) => key === kase.stage);
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <Link href={`${base}/cases`} className="inline-flex items-center gap-2 text-sm text-[#0f1c36]/55 transition hover:text-[#9a7436]">
        <ArrowRight size={15} /> كل القضايا
      </Link>

      <div className="mt-4 rounded-[2rem] border border-[#0f1c36]/[0.07] bg-white p-6 shadow-[0_10px_30px_-20px_rgba(15,28,54,0.25)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="tnum text-sm font-semibold text-[#0f1c36]/50" dir="ltr">{kase.internalNumber}</span>
            <h1 className="mt-1 font-arabic-heading text-3xl font-bold leading-snug sm:text-4xl">{kase.title}</h1>
          </div>
          <Chip className={statusTone(kase.status)}>{STATUS_AR[kase.status] ?? kase.status}</Chip>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-[#0f1c36]/[0.06] pt-6 text-sm sm:grid-cols-3">
          <Fact label="نوع القضية" value={TYPE_AR[kase.type] ?? kase.type} />
          <Fact label="المحكمة" value={kase.court ?? "—"} />
          <Fact label="صفتك في القضية" value={kase.clientRole ? ROLE_AR[kase.clientRole] ?? kase.clientRole : "—"} />
        </dl>

        {/* stage progress */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-[#0f1c36]/60">مرحلة القضية</p>
          <ol className="mt-4 grid grid-cols-5 gap-2">
            {STAGES.map(([key, label], i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              return (
                <li key={key} className="flex flex-col items-center gap-2 text-center">
                  <span className="relative flex w-full items-center">
                    <span className={`h-1 flex-1 rounded-full ${i === 0 ? "opacity-0" : done || current ? "bg-[#b08d57]" : "bg-[#0f1c36]/10"}`} />
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${current
                        ? "bg-gold ring-4 ring-[#d4af6a]/25"
                        : done
                          ? "bg-[#0f1c36] text-[#f1dfb3]"
                          : "bg-[#f7f4ee] text-[#0f1c36]/40 ring-1 ring-[#0f1c36]/10"
                        }`}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`h-1 flex-1 rounded-full ${i === STAGES.length - 1 ? "opacity-0" : done ? "bg-[#b08d57]" : "bg-[#0f1c36]/10"}`} />
                  </span>
                  <span className={`text-[11px] leading-5 sm:text-xs ${current ? "font-bold text-[#0f1c36]" : "text-[#0f1c36]/50"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel title="التحديثات من المحامي" icon={<BellRing size={18} />}>
            {kase.clientUpdates.length === 0 ? (
              <Empty icon={<BellRing size={26} />} text="لا توجد تحديثات بعد." />
            ) : (
              <ul className="space-y-3">
                {kase.clientUpdates.map((u) => (
                  <li key={u.id} className="rounded-2xl border-r-4 border-[#b08d57] bg-[#fbf9f4] p-4">
                    <p className="whitespace-pre-line text-sm leading-7">{u.body}</p>
                    {u.sentAt && <p className="tnum mt-2 text-xs text-[#0f1c36]/45">{fmtDateTime(u.sentAt)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="مسار القضية" icon={<History size={18} />}>
            {kase.timeline.length === 0 ? (
              <Empty icon={<History size={26} />} text="لا توجد أحداث مسجّلة بعد." />
            ) : (
              <ol className="relative space-y-5 pr-5">
                <span aria-hidden className="absolute bottom-2 right-[5px] top-2 w-px bg-[#0f1c36]/10" />
                {kase.timeline.map((e) => (
                  <li key={e.id} className="relative">
                    <span aria-hidden className="absolute -right-5 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-[#b08d57] ring-1 ring-[#b08d57]/40" />
                    <p className="tnum text-xs text-[#0f1c36]/45">{fmtDate(e.eventDate)}</p>
                    <p className="mt-0.5 font-semibold">{e.title}</p>
                    {e.description && <p className="mt-1 text-sm leading-7 text-[#0f1c36]/60">{e.description}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="الجلسات" icon={<Gavel size={18} />}>
            {kase.hearings.length === 0 ? (
              <Empty icon={<Gavel size={26} />} text="لا توجد جلسات بعد." />
            ) : (
              <ul className="space-y-3">
                {kase.hearings.map((h) => {
                  const upcoming = h.date >= now;
                  return (
                    <li key={h.id} className={`rounded-2xl p-4 ${upcoming ? "bg-[#0f1c36] text-white" : "border border-[#0f1c36]/[0.06]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={`tnum font-semibold ${upcoming ? "text-[#f1dfb3]" : ""}`}>{fmtDateTime(h.date)}</p>
                        {upcoming && <span className="rounded-full bg-[#d4af6a]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#f1dfb3]">قادمة</span>}
                      </div>
                      <p className={`mt-1 flex items-center gap-1.5 text-xs ${upcoming ? "text-white/60" : "text-[#0f1c36]/55"}`}>
                        <Landmark size={13} /> {h.court}{h.room ? ` · قاعة ${h.room}` : ""}
                      </p>
                      {h.outcome && <p className="mt-2 text-sm">{h.outcome}</p>}
                      {h.nextDate && <p className="tnum mt-2 text-xs font-semibold text-[#9a7436]">الجلسة التالية: {fmtDate(h.nextDate)}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="المستندات المشتركة" icon={<FileText size={18} />}>
            {kase.documents.length === 0 ? (
              <Empty icon={<FileText size={26} />} text="لم يشارك المكتب أي مستندات بعد." />
            ) : (
              <ul className="space-y-2">
                {kase.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-[#0f1c36]/[0.06] p-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#9a7436]"><FileText size={18} /></span>
                    <span className="min-w-0 flex-1">
                      {d.storageKey.startsWith("asset:") ? (
                        <a href={`/api/documents/${d.id}`} className="block truncate text-sm font-semibold text-[#9a7436] hover:underline">{d.title}</a>
                      ) : (
                        <span className="block truncate text-sm font-semibold">{d.title}</span>
                      )}
                      <span className="tnum block text-xs text-[#0f1c36]/45">{fmtDate(d.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#0f1c36]/50">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
