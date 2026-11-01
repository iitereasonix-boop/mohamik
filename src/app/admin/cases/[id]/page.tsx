import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, User } from "lucide-react";
import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { STAGE_AR, STATUS_AR, TYPE_AR, statusTone } from "@/lib/portal";
import { withTenant } from "@/lib/tenant";
import CaseDetails, { ROLE_AR, caseSelect } from "../CaseDetails";
import CaseUpdateForm from "./CaseUpdateForm";

export const dynamic = "force-dynamic";

export default async function AdminCasePage({ params }: { params: { id: string } }) {
  const ctx = await guardSection("cases");
  const tenantId = ctx.tenantId;
  const showNotes = can(ctx.role, "note.confidential.view");
  const kase = await withTenant(tenantId, (tx) => tx.case.findFirst({
    where: { id: params.id, tenantId },
    select: { ...caseSelect(showNotes), client: { select: { id: true, name: true, mobile: true } } },
  }));
  if (!kase) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/cases" className="inline-flex items-center gap-2 text-sm text-warmgray-500 hover:text-[#9a7436]"><ArrowRight size={15} /> كل القضايا</Link>

      <header className="mt-3 rounded-3xl bg-[#0f1c36] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="tnum text-sm text-white/60">{kase.internalNumber}{kase.courtNumber ? ` · ${kase.courtNumber}` : ""}</p>
            <h1 className="mt-1 font-arabic-heading text-3xl font-bold leading-snug">{kase.title}</h1>
            <p className="mt-2 text-sm text-white/70">{TYPE_AR[kase.type] ?? kase.type} · {STAGE_AR[kase.stage] ?? kase.stage} · {ROLE_AR[kase.clientRole] ?? kase.clientRole}</p>
            <Link href={`/admin/clients/${kase.client.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#f1dfb3] hover:underline">
              <User size={15} /> {kase.client.name}
            </Link>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(kase.status)}`}>{STATUS_AR[kase.status] ?? kase.status}</span>
        </div>
      </header>

      {can(ctx.role, "case.edit") && <CaseUpdateForm caseId={params.id} />}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <CaseDetails c={kase} />
      </div>
    </div>
  );
}
