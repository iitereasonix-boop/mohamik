import { guardSection } from "@/lib/admin-access";
import { can } from "@/lib/permissions";
import { withTenant } from "@/lib/tenant";
import LibraryManager from "./LibraryManager";

export const dynamic = "force-dynamic";

export default async function HukmLibraryPage() {
  const ctx = await guardSection("hukm");
  const tenantId = ctx.tenantId;
  const [docs, clients, cases, closed] = await withTenant(tenantId, (tx) =>
    Promise.all([
      tx.knowledgeDoc.findMany({
        where: { tenantId },
        select: { id: true, kind: true, title: true, reference: true, chunkCount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      tx.client.count({ where: { tenantId } }),
      tx.case.count({ where: { tenantId } }),
      tx.case.count({ where: { tenantId, status: { in: ["CLOSED_WON", "CLOSED_LOST", "CLOSED_SETTLED", "CLOSED_OTHER"] } } }),
    ])
  );
  return (
    <LibraryManager
      docs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
      canEdit={can(ctx.role, "knowledge.approve")}
      stats={{ clients, cases, closed }}
    />
  );
}
