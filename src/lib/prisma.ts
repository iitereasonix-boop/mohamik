import { PrismaClient } from "@prisma/client";

// Single shared Prisma client (dev). In production, instantiate per-request
// with the tenant id passed to a transaction so RLS can enforce isolation:
//
//   export function tenantDb(tenantId: string) {
//     return prisma.$transaction(
//       async (tx) => {
//         await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
//         return tx;
//       },
//       { isolationLevel: "Serializable" }
//     );
//   }

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
