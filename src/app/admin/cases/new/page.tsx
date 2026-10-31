import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { withTenant } from "@/lib/tenant";
import CaseForm from "./CaseForm";

export const dynamic = "force-dynamic";

export default async function NewCasePage({ searchParams }: { searchParams: { client?: string } }) {
  const ctx = await guardSection("cases");
  if (!can(ctx.role, "case.edit")) redirect("/admin/cases");
  const tenantId = ctx.tenantId;
  const clients = await withTenant(tenantId, (tx) => tx.client.findMany({
    where: { tenantId },
    select: { id: true, name: true, mobile: true },
    orderBy: { name: "asc" },
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/cases" className="inline-flex items-center gap-2 text-sm text-warmgray-500 hover:text-[#9a7436]"><ArrowRight size={15} /> كل القضايا</Link>
      <h1 className="mt-3 text-2xl font-bold">إضافة قضية</h1>
      <p className="mt-1 text-sm text-warmgray-500">الخانات المعلّمة بـ * مطلوبة. يصل نص القضية إلى «حُكم» ولا يظهر للعميل في بوابته.</p>
      <CaseForm clients={clients} initialClient={searchParams.client} />
    </div>
  );
}
