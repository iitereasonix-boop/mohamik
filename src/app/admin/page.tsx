import Link from "next/link";
import { withTenant } from "@/lib/tenant";
import { guardSection } from "@/lib/admin-access";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function AdminDashboard() {
  const ctx = await guardSection("dashboard");
  const tenantId = ctx!.tenantId!;

  const [hearings, appts, deadlines, newIntake, overdueTasks, unread, caseCount, clientCount] =
    await withTenant(tenantId, (tx) => Promise.all([
      tx.hearing.findMany({
        where: { case: { tenantId }, date: { gte: startOfToday(), lt: endOfToday() } },
        include: { case: { select: { title: true, internalNumber: true } } },
        orderBy: { date: "asc" },
      }),
      tx.appointment.findMany({
        where: { tenantId, startAt: { gte: startOfToday(), lt: endOfToday() } },
        include: { client: { select: { name: true, mobile: true } } },
        orderBy: { startAt: "asc" },
      }),
      tx.deadline.findMany({
        where: {
          case: { tenantId },
          completed: false,
          dueDate: { lte: new Date(Date.now() + 7 * 864e5) },
        },
        include: { case: { select: { title: true, internalNumber: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      tx.consultRequest.count({ where: { tenantId, status: "NEW" } }),
      tx.task.count({
        where: { tenantId, status: { not: "DONE" }, dueDate: { lt: new Date() } },
      }),
      tx.clientMessage.count({ where: { tenantId, fromClient: true, readByStaff: false } }),
      tx.case.count({ where: { tenantId } }),
      tx.client.count({ where: { tenantId } }),
    ]));

  const cards = [
    { label: t("todayHearings"), count: hearings.length, color: "text-amber-700" },
    { label: t("todayAppointments"), count: appts.length, color: "text-blue-700" },
    { label: t("deadlines7"), count: deadlines.length, color: "text-red-700" },
    { label: t("newCaseRequests"), count: newIntake, color: "text-burgundy" },
    { label: t("overdueTasks"), count: overdueTasks, color: "text-red-700" },
    { label: t("unreadMessages"), count: unread, color: "text-ink" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      <p className="mt-1 text-sm text-warmgray-500 tnum">
        {caseCount} قضية · {clientCount} عميل
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className={`text-3xl font-bold tnum ${c.color}`}>{c.count}</p>
            <p className="mt-1 text-sm text-warmgray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">{t("todayHearings")}</h2>
          {hearings.length === 0 ? (
            <p className="mt-2 text-sm text-warmgray-500">لا توجد جلسات اليوم.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {hearings.map((h) => (
                <li key={h.id} className="card">
                  <p className="font-semibold">{h.case.title}</p>
                  <p className="text-xs text-warmgray-500 tnum">
                    {fmt(h.date)} · {h.court}
                    {h.room ? ` · ${h.room}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">{t("todayAppointments")}</h2>
          {appts.length === 0 ? (
            <p className="mt-2 text-sm text-warmgray-500">لا توجد مواعيد اليوم.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {appts.map((a) => (
                <li key={a.id} className="card">
                  <p className="font-semibold">{a.client.name}</p>
                  <p className="text-xs text-warmgray-500 tnum">
                    {fmt(a.startAt)} · {a.client.mobile}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t("deadlines7")}</h2>
        {deadlines.length === 0 ? (
          <p className="mt-2 text-sm text-warmgray-500">لا مواعيد نهائية قريبة.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {deadlines.map((d) => (
              <li key={d.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{d.description}</p>
                  <p className="text-xs text-warmgray-500">{d.case.title}</p>
                </div>
                <span className="text-xs text-red-700 tnum">{fmt(d.dueDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/admin/intake" className="btn-primary mt-8 inline-block">
        فتح صندوق الطلبات ({newIntake})
      </Link>
    </div>
  );
}
