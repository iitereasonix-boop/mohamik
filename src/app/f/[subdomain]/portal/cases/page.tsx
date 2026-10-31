import Link from "next/link";
import { ArrowLeft, CalendarClock, FolderOpen, Landmark } from "lucide-react";
import { withTenant } from "@/lib/tenant";
import { STAGE_AR, STATUS_AR, TYPE_AR, fmtDate, getPortal, statusTone } from "@/lib/portal";
import { Chip, Empty, LoginRequired, PageHeader } from "@/components/portal/ui";

export default async function PortalCasesPage({ params }: { params: { subdomain: string } }) {
  const { firm, client } = await getPortal(params.subdomain);
  if (!client) return <LoginRequired subdomain={firm.subdomain} what="قضاياك" />;

  const now = new Date();
  const cases = await withTenant(firm.id, (tx) =>
    tx.case.findMany({
      where: { tenantId: firm.id, clientId: client.id },
      select: {
        id: true,
        internalNumber: true,
        title: true,
        type: true,
        stage: true,
        status: true,
        court: true,
        updatedAt: true,
        hearings: {
          where: { visibleToClient: true, date: { gte: now } },
          orderBy: { date: "asc" },
          take: 1,
          select: { date: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
  );

  const base = `/f/${firm.subdomain}/portal`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <PageHeader eyebrow="ملفاتي" title="قضاياي" text="كل قضاياك لدى المكتب، مع مرحلتها الحالية وموعد الجلسة القادمة." />

      {cases.length === 0 ? (
        <div className="mt-10">
          <Empty icon={<FolderOpen size={30} />} text="لا توجد قضايا مسجّلة باسمك بعد. عند فتح ملف قضيتك ستظهر هنا مباشرة." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`${base}/cases/${c.id}`}
              className="group flex flex-col rounded-3xl border border-[#0f1c36]/[0.07] bg-white p-6 shadow-[0_10px_30px_-22px_rgba(15,28,54,0.3)] transition hover:-translate-y-0.5 hover:border-[#b08d57]/40 hover:shadow-[0_24px_50px_-26px_rgba(15,28,54,0.4)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="tnum rounded-lg bg-[#f7f4ee] px-2.5 py-1 text-xs font-semibold text-[#0f1c36]/60" dir="ltr">{c.internalNumber}</span>
                <Chip className={statusTone(c.status)}>{STATUS_AR[c.status] ?? c.status}</Chip>
              </div>
              <h2 className="mt-4 text-lg font-bold leading-8">{c.title}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#0f1c36]/60">
                <span>{TYPE_AR[c.type] ?? c.type}</span>
                <span>المرحلة: <strong className="font-semibold text-[#0f1c36]">{STAGE_AR[c.stage] ?? c.stage}</strong></span>
                {c.court && <span className="flex items-center gap-1.5"><Landmark size={14} /> {c.court}</span>}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#0f1c36]/[0.06] pt-4">
                {c.hearings[0] ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#9a7436]">
                    <CalendarClock size={16} /> الجلسة القادمة: <span className="tnum">{fmtDate(c.hearings[0].date)}</span>
                  </span>
                ) : (
                  <span className="text-sm text-[#0f1c36]/45">لا جلسات قادمة</span>
                )}
                <ArrowLeft size={17} className="shrink-0 text-[#0f1c36]/30 transition group-hover:-translate-x-1 group-hover:text-[#9a7436]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
