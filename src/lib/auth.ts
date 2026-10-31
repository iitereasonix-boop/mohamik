import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

// Phase 1: email + password with server-side permission checks.
// 2FA (TOTP) fields exist on the models; enforcement lands in Phase 6 hardening.

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // session timeout: 8h
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: {}, password: {}, subdomain: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const subdomain = credentials.subdomain?.toLowerCase().trim();

        if (!subdomain) {
          const platformUser = await prisma.platformUser.findUnique({ where: { email } });
          if (!platformUser?.active) return null;
          if (!(await bcrypt.compare(credentials.password, platformUser.passwordHash))) return null;
          return {
            id: platformUser.id,
            email: platformUser.email,
            name: platformUser.name,
            kind: "PLATFORM",
            platformRole: platformUser.platformRole,
          } as any;
        }

        const tenant = await prisma.tenant.findUnique({
          where: { subdomain },
          select: { id: true, status: true, subdomain: true },
        });
        if (!tenant || tenant.status !== "ACTIVE") return null;

        const user = await withTenant(tenant.id, (tx) =>
          tx.user.findFirst({
            where: { tenantId: tenant.id, email, active: true },
            select: {
              id: true,
              email: true,
              name: true,
              kind: true,
              tenantId: true,
              tenantRole: true,
              passwordHash: true,
            },
          })
        );
        if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
          return null;
        }

        await withTenant(tenant.id, (tx) =>
          tx.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
        );
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          kind: user.kind,
          tenantId: user.tenantId ?? undefined,
          role: user.tenantRole ?? undefined,
          subdomain: tenant.subdomain,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.kind = (user as any).kind;
        token.tenantId = (user as any).tenantId;
        token.role = (user as any).role;
        token.platformRole = (user as any).platformRole;
        token.subdomain = (user as any).subdomain;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.kind = token.kind as any;
      session.user.tenantId = token.tenantId as string | undefined;
      session.user.role = token.role as string | undefined;
      session.user.platformRole = token.platformRole as string | undefined;
      session.user.subdomain = token.subdomain as string | undefined;
      return session;
    },
  },
};
