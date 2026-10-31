import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { withTenant } from "@/lib/tenant";
import PlatformConsole from "./PlatformConsole";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const session = await getSession();
  if (!session?.user?.id || session.user.kind !== "PLATFORM") redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/");

  const [pending, firms, activeCount, totalCount, rejectedCount] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: "PENDING_VERIFICATION" },
      select: {
        id: true,
        name: true,
        subdomain: true,
        email: true,
        phone: true,
        address: true,
        barNumber: true,
        commercialReg: true,
        createdAt: true,
        practiceAreas: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
      select: {
        id: true,
        name: true,
        subdomain: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "REJECTED" } }),
  ]);

  // users are tenant-scoped (RLS), so read each applicant's managing partner
  // inside that firm's own context
  const owners = await Promise.all(
    pending.map((tenant) =>
      withTenant(tenant.id, (tx) =>
        tx.user.findFirst({
          where: { tenantId: tenant.id, tenantRole: "MANAGING_PARTNER" },
          select: { name: true, email: true },
        })
      )
    )
  );

  return (
    <PlatformConsole
      adminName={session.user.name ?? "مدير المنصة"}
      initialRequests={pending.map((tenant, i) => ({
        ...tenant,
        createdAt: tenant.createdAt.toISOString(),
        ownerName: owners[i]?.name ?? "الشريك المدير",
        ownerEmail: owners[i]?.email ?? tenant.email ?? "",
      }))}
      initialFirms={firms.flatMap((tenant) =>
        tenant.status === "ACTIVE" || tenant.status === "SUSPENDED"
          ? [{
              ...tenant,
              status: tenant.status === "ACTIVE" ? "ACTIVE" as const : "SUSPENDED" as const,
              createdAt: tenant.createdAt.toISOString(),
            }]
          : []
      )}
      stats={{ pending: pending.length, active: activeCount, total: totalCount, rejected: rejectedCount }}
    />
  );
}
