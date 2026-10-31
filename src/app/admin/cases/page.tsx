import Link from "next/link";
import { withTenant } from "@/lib/tenant";
import { guardSection } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

const TYPE_AR: Record<string, string> = {
  CRIMINAL: "جزائية", CIVIL: "مدنية", COMMERCIAL: "تجارية", LABOUR: "عمالية",
  FAMILY: "أحوال شخصية", REAL_ESTATE: "عقارية وإيجارات", COMPANIES: "شركات",
  CYBERCRIME: "جرائم إلكترونية", ENFORCEMENT: "تنفيذ", OTHER: "أخرى",
};
const STAGE_AR: Record<string, string> = {
  PRE_LITIGATION: "ما قبل التقاضي", FIRST_INSTANCE: "أول درجة",
  APPEAL: "استئناف", CASSATION: "تمييز", ENFORCEMENT: "تنفيذ",
};
const STATUS_AR: Record<string, string> = {
  INTAKE_REVIEW: "قيد المراجعة", ACTIVE: "نشطة", SUSPENDED: "موقوفة",
  CLOSED_WON: "مغلقة – مكسب", CLOSED_LOST: "مغلقة – خسارة",
  CLOSED_SETTLED: "مغلقة – تسوية", CLOSED_OTHER: "مغلقة – أخرى",
};

export default async function AdminCasesPage() {
  const ctx = await guardSection("cases");
  const tenantId = ctx!.tenantId!;
  const cases = await withTenant(tenantId, (tx) => tx.case.findMany({
    where: { tenantId },
    select: {
      id: true,
      internalNumber: true,
      title: true,
      type: true,
      stage: true,
      status: true,
      client: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">القضايا</h1>
      {cases.length === 0 ? (
        <p className="mt-4 text-sm text-warmgray-500">لا توجد قضايا بعد.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {cases.map((c) => (
            <Link key={c.id} href={`/admin/cases/${c.id}`} className="card flex items-center justify-between transition hover:border-[#b08d57] hover:bg-[#fbf7ee]">
              <div>
                <p className="font-semibold">
                  {c.title}{" "}
                  <span className="text-xs text-warmgray-400 tnum">{c.internalNumber}</span>
                </p>
                <p className="mt-0.5 text-xs text-warmgray-500">
                  {c.client.name} · {TYPE_AR[c.type]} · {STAGE_AR[c.stage]}
                </p>
              </div>
              <span className="badge bg-paper-100 text-ink">{STATUS_AR[c.status] ?? c.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
