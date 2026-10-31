import { withTenant } from "@/lib/tenant";
import { requirePermission } from "@/lib/session";
import { guardSection } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium" }).format(d);

export default async function AdminIntakePage() {
  const ctx = await guardSection("intake");
  await requirePermission("case.view");

  const tenantId = ctx!.tenantId!;
  const [consults, appointments] = await withTenant(tenantId, (tx) => Promise.all([
    tx.consultRequest.findMany({
      where: { tenantId },
      include: { client: { select: { name: true, mobile: true } } },
      orderBy: { createdAt: "desc" },
    }),
    tx.appointment.findMany({
      where: { tenantId },
      include: { client: { select: { name: true, mobile: true } } },
      orderBy: { startAt: "desc" },
      take: 20,
    }),
  ]));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">صندوق الطلبات</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">طلبات الاستشارة</h2>
        {consults.length === 0 ? (
          <p className="mt-2 text-sm text-warmgray-500">لا توجد طلبات.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {consults.map((r) => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.subject}</p>
                  <span className="badge bg-paper-100 text-ink">{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-warmgray-500">
                  {r.client.name} · <span className="tnum">{r.client.mobile}</span> ·{" "}
                  {fmt(r.createdAt)}
                </p>
                <p className="mt-2 text-sm text-warmgray-500 whitespace-pre-line">{r.details}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">أحدث المواعيد المحجوزة</h2>
        {appointments.length === 0 ? (
          <p className="mt-2 text-sm text-warmgray-500">لا توجد مواعيد.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {appointments.map((a) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{a.client.name}</p>
                  <p className="text-xs text-warmgray-500 tnum">{a.client.mobile}</p>
                </div>
                <span className="text-xs tnum text-warmgray-500">{fmt(a.startAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
