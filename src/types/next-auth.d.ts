import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      kind: "PLATFORM" | "TENANT" | "CLIENT";
      tenantId?: string;
      role?: string; // TenantRole or PlatformRole as string
      platformRole?: string;
      subdomain?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    id?: string;
    kind?: string;
    tenantId?: string;
    role?: string;
    platformRole?: string;
    subdomain?: string;
  }
}
