import { withTenant } from "@/lib/tenant";
import { guardSection } from "@/lib/admin-access";
import AppointmentActions from "./AppointmentActions";

export const dynamic = "force-dynamic";

const KIND_AR: Record<string, string> = {
  IN_OFFICE: "في المكتب",
  PHONE: "هاتفي",
  VIDEO: "مرئي",
};

const STATUS: Record<string, { label: string; tone: string }> = {
  SCHEDULED: { label: "بانتظار الموافقة", tone: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "مؤكد", tone: "bg-emerald-50 text-emerald-700" },
  COMPLETED: { label: "منجز", tone: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "ملغى / مرفوض", tone: "bg-red-50 text-red-700" },
  NO_SHOW: { label: "لم يحضر", tone: "bg-slate-100 text-slate-600" },
};

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);

type Appt = {
  id: string;
  kind: string;
  status: string;
  startAt: Date;
  notes: string | null;
  client: { name: string; mobile: string };
  staff: { name: string } | null;
};

export default async function AdminAppointmentsPage() {
  const ctx = await guardSection("appointments");
  const tenantId = ctx.tenantId;
  const appts: Appt[] = await withTenant(tenantId, (tx) => tx.appointment.findMany({
    where: { tenantId },
    select: {
      id: true, kind: true, status: true, startAt: true, notes: true,
      client: { select: { name: true, mobile: true } },
      staff: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  }));

  const now = new Date();
  const pending = appts.filter((a) => a.status === "SCHEDULED");
  const upcoming = appts.filter((a) => a.status === "CONFIRMED" && a.startAt >= now);
  const past = appts
    .filter((a) => !pending.includes(a) && !upcoming.includes(a))
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
    .slice(0, 30);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-arabic-heading text-3xl font-bold">المواعيد</h1>
      <p className="mt-1 text-sm text-warmgray-500">طلبات المواعيد من بوابة العملاء تصل هنا. وافق عليها أو ارفضها، ويرى العميل الحالة فورًا في بوابته.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["بانتظار الموافقة", pending.length, "text-amber-700"],
          ["مؤكدة قادمة", upcoming.length, "text-emerald-700"],
          ["سابقة", past.length, "text-slate-600"],
        ].map(([label, count, tone]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className={`tnum text-3xl font-bold ${tone}`}>{count as number}</p>
            <p className="mt-1 text-xs text-warmgray-500">{label as string}</p>
          </div>
        ))}
      </div>

      <Group title="بانتظار الموافقة" items={pending} empty="لا توجد طلبات جديدة." highlight />
      <Group title="المواعيد المؤكدة القادمة" items={upcoming} empty="لا توجد مواعيد مؤكدة قادمة." />
      <Group title="السابقة والمنتهية" items={past} empty="لا يوجد سجل بعد." />
    </div>
  );
}

function Group({ title, items, empty, highlight = false }: { title: string; items: Appt[]; empty: string; highlight?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-5 text-sm text-warmgray-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between ${highlight ? "border-amber-200 shadow-sm" : "border-slate-200"}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{a.client.name}</p>
                  <span className={`badge ${STATUS[a.status]?.tone ?? ""}`}>{STATUS[a.status]?.label ?? a.status}</span>
                </div>
                <p className="tnum mt-1 text-sm">{fmt(a.startAt)}</p>
                <p className="mt-0.5 text-xs text-warmgray-500">
                  <span dir="ltr" className="tnum">{a.client.mobile}</span> · {KIND_AR[a.kind] ?? a.kind}
                  {a.staff ? ` · بإشراف ${a.staff.name}` : ""}
                </p>
                {a.notes && <p className="mt-1.5 text-sm text-warmgray-500">«{a.notes}»</p>}
              </div>
              <AppointmentActions id={a.id} status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
