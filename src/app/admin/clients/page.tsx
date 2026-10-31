import { withTenant } from "@/lib/tenant";
import { guardSection } from "@/lib/admin-access";
import ClientsTable from "./ClientsTable";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const ctx = await guardSection("clients");
  const tenantId = ctx.tenantId;
  const clients = await withTenant(tenantId, (tx) => tx.client.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      mobile: true,
      email: true,
      source: true,
      _count: { select: { cases: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">العملاء</h1>
      <p className="mt-1 text-sm text-warmgray-500">اضغط على أي عميل لفتح ملفه الكامل.</p>
      <ClientsTable
        clients={clients.map(({ _count, ...c }) => ({ ...c, cases: _count.cases, appointments: _count.appointments }))}
      />
    </div>
  );
}
