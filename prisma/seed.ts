// Seed data for Mohamik (Phase 1)
// 2 demo firms (clearly marked), staff, clients, cases, hearings, appointments.
import { Prisma, PrismaClient, UserKind, TenantRole, TenantStatus, CaseType, CaseStage, CaseStatus, ClientRoleInCase, HearingPurpose, DeadlineKind, AppointmentKind, PlanTier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Row-Level Security is forced on tenant tables, so every tenant-scoped write
// must run with app.tenant_id set. This extension does that per query.
function forTenant(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await client.$transaction([
              client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}

async function main() {
  console.log("Seeding Mohamik demo data...");

  // ── Plans ──────────────────────────────────────────────────
  const plans = await Promise.all(
    (
      [
        ["SOLO", "منفرد", "Solo", 1, 5, 100, 19, 25],
        ["FIRM", "مكتب", "Firm", 10, 50, 1000, 79, 99],
        ["ENTERPRISE", "مؤسسي", "Enterprise", 50, 500, 10000, 249, 299],
      ] as const
    ).map(([tier, nameAr, nameEn, maxLawyers, maxStorageGb, monthlyAiCalls, jod, usd]) =>
      prisma.plan.upsert({
        where: { tier: tier as PlanTier },
        update: {},
        create: {
          tier: tier as PlanTier,
          nameAr, nameEn,
          maxLawyers, maxStorageGb, monthlyAiCalls,
          monthlyPriceJod: jod, monthlyPriceUsd: usd,
        },
      })
    )
  );

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // ── Firm A (company) ───────────────────────────────────────
  const firmA = await prisma.tenant.upsert({
    where: { subdomain: "demo-firm" },
    update: {},
    create: {
      name: "مكتب العدل والمحامين (تجريبي)",
      subdomain: "demo-firm",
      status: TenantStatus.ACTIVE,
      barNumber: "JB-12345",
      address: "عمّان – شارع المدينة المنورة",
      phone: "+962790000001",
      email: "info@demo-firm.example",
      practiceAreas: [CaseType.CIVIL, CaseType.COMMERCIAL, CaseType.LABOUR],
      demo: true,
    },
  });

  const firmB = await prisma.tenant.upsert({
    where: { subdomain: "solo-demo" },
    update: {},
    create: {
      name: "مكتب المحامي سامر (تجريبي)",
      subdomain: "solo-demo",
      status: TenantStatus.ACTIVE,
      barNumber: "JB-67890",
      address: "إربد – شارع الجامعة",
      phone: "+962790000002",
      email: "samer@solo-demo.example",
      practiceAreas: [CaseType.FAMILY, CaseType.REAL_ESTATE],
      demo: true,
    },
  });

  const dbA = prisma.$extends(forTenant(firmA.id));
  const dbB = prisma.$extends(forTenant(firmB.id));

  // ── Staff firm A ───────────────────────────────────────────
  const ownerA = await dbA.user.upsert({
    where: { tenantId_email: { tenantId: firmA.id, email: "owner@demo-firm.example" } },
    update: {},
    create: {
      kind: UserKind.TENANT, tenantId: firmA.id,
      email: "owner@demo-firm.example", passwordHash, name: "أحمد العدل",
      tenantRole: TenantRole.MANAGING_PARTNER,
    },
  });
  const lawyerA = await dbA.user.upsert({
    where: { tenantId_email: { tenantId: firmA.id, email: "lawyer@demo-firm.example" } },
    update: {},
    create: {
      kind: UserKind.TENANT, tenantId: firmA.id,
      email: "lawyer@demo-firm.example", passwordHash, name: "ليلى حسن",
      tenantRole: TenantRole.LAWYER,
    },
  });
  const secretaryA = await dbA.user.upsert({
    where: { tenantId_email: { tenantId: firmA.id, email: "secretary@demo-firm.example" } },
    update: {},
    create: {
      kind: UserKind.TENANT, tenantId: firmA.id,
      email: "secretary@demo-firm.example", passwordHash, name: "رنا خليل",
      tenantRole: TenantRole.SECRETARY,
    },
  });

  // ── Staff firm B (solo lawyer) ─────────────────────────────
  await dbB.user.upsert({
    where: { tenantId_email: { tenantId: firmB.id, email: "samer@solo-demo.example" } },
    update: {},
    create: {
      kind: UserKind.TENANT, tenantId: firmB.id,
      email: "samer@solo-demo.example", passwordHash, name: "سامر المحامي",
      tenantRole: TenantRole.MANAGING_PARTNER,
    },
  });

  // ── Subscriptions ──────────────────────────────────────────
  const firmPlan = plans.find((p) => p.tier === "FIRM")!;
  const soloPlan = plans.find((p) => p.tier === "SOLO")!;
  const start = new Date(); const end = new Date(); end.setMonth(end.getMonth() + 1);
  await dbA.subscription.upsert({
    where: { tenantId: firmA.id },
    update: {},
    create: { tenantId: firmA.id, planId: firmPlan.id, status: "ACTIVE", currentStart: start, currentEnd: end },
  });
  await dbB.subscription.upsert({
    where: { tenantId: firmB.id },
    update: {},
    create: { tenantId: firmB.id, planId: soloPlan.id, status: "TRIALING", trialEndsAt: end, currentStart: start, currentEnd: end },
  });

  // ── Clients ────────────────────────────────────────────────
  const clientsA = [];
  for (let i = 1; i <= 10; i++) {
    clientsA.push(
      await dbA.client.upsert({
        where: { tenantId_mobile: { tenantId: firmA.id, mobile: `+96279100000${i.toString().padStart(2, "0")}` } },
        update: {},
        create: {
          tenantId: firmA.id,
          name: `عميل تجريبي ${i}`,
          mobile: `+96279100000${i.toString().padStart(2, "0")}`,
          email: `client${i}@demo.example`,
          source: "seed",
          consentAt: new Date(),
        },
      })
    );
  }

  // ── Client portal login for demo client 1 (has cases) ─────
  const clientUser = await dbA.user.upsert({
    where: { tenantId_email: { tenantId: firmA.id, email: "client1@demo.example" } },
    update: {},
    create: {
      kind: UserKind.CLIENT, tenantId: firmA.id,
      email: "client1@demo.example", passwordHash, name: clientsA[0].name,
      mobile: clientsA[0].mobile,
    },
  });
  await dbA.client.update({ where: { id: clientsA[0].id }, data: { userId: clientUser.id } });

  // ── Cases (15, varied) ─────────────────────────────────────
  const caseSpecs: Array<[CaseType, CaseStage, CaseStatus, ClientRoleInCase]> = [
    [CaseType.CIVIL, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.LABOUR, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.COMMERCIAL, CaseStage.APPEAL, CaseStatus.ACTIVE, ClientRoleInCase.DEFENDANT],
    [CaseType.CRIMINAL, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.COMPLAINANT],
    [CaseType.FAMILY, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.REAL_ESTATE, CaseStage.ENFORCEMENT, CaseStatus.CLOSED_WON, ClientRoleInCase.PLAINTIFF],
    [CaseType.CIVIL, CaseStage.CASSATION, CaseStatus.ACTIVE, ClientRoleInCase.DEFENDANT],
    [CaseType.LABOUR, CaseStage.PRE_LITIGATION, CaseStatus.INTAKE_REVIEW, ClientRoleInCase.PLAINTIFF],
    [CaseType.COMMERCIAL, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.CIVIL, CaseStage.FIRST_INSTANCE, CaseStatus.CLOSED_SETTLED, ClientRoleInCase.DEFENDANT],
    [CaseType.FAMILY, CaseStage.APPEAL, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.ENFORCEMENT, CaseStage.ENFORCEMENT, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
    [CaseType.REAL_ESTATE, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.DEFENDANT],
    [CaseType.LABOUR, CaseStage.FIRST_INSTANCE, CaseStatus.CLOSED_LOST, ClientRoleInCase.DEFENDANT],
    [CaseType.CIVIL, CaseStage.FIRST_INSTANCE, CaseStatus.ACTIVE, ClientRoleInCase.PLAINTIFF],
  ];

  let caseNo = 1;
  for (const [type, stage, status, role] of caseSpecs) {
    const client = clientsA[(caseNo - 1) % clientsA.length];
    const cn = `2024-${caseNo.toString().padStart(4, "0")}`;
    const existing = await dbA.case.findFirst({ where: { tenantId: firmA.id, internalNumber: cn } });
    if (!existing) {
      const created = await dbA.case.create({
        data: {
          tenantId: firmA.id,
          internalNumber: cn,
          courtNumber: `جزء/${1000 + caseNo}/2024`,
          title: `قضية تجريبية ${caseNo} – ${type}`,
          type, stage, status,
          court: "المحكمة الابتدائية – عمّان",
          chamber: "الثانية",
          clientRole: role,
          claimValue: 1000 * caseNo,
          clientSummary: "ملخص وقائع العميل (بيانات تجريبية).",
          demo: true,
          clientId: client.id,
          lawyers: { connect: [caseNo % 2 === 0 ? { id: lawyerA.id } : { id: ownerA.id }] },
        },
      });

      // hearings for active cases
      if (status === CaseStatus.ACTIVE) {
        const hDate = new Date(); hDate.setDate(hDate.getDate() + (caseNo % 14) + 1);
        await dbA.hearing.create({
          data: {
            caseId: created.id,
            date: hDate,
            court: created.court!,
            purpose: HearingPurpose.PLEADINGS,
            visibleToClient: true,
          },
        });
      }

      // a deadline
      const dDate = new Date(); dDate.setDate(dDate.getDate() + 5);
      await dbA.deadline.create({
        data: {
          caseId: created.id,
          kind: DeadlineKind.DOCUMENT_SUBMISSION,
          dueDate: dDate,
          description: "تقديم مذكرة (بيانات تجريبية)",
          confirmedByUserId: lawyerA.id,
        },
      });

      // timeline event
      await dbA.timelineEvent.create({
        data: {
          caseId: created.id,
          kind: "filing",
          title: "إيداع الدعوى",
          eventDate: new Date(),
          visibleToClient: true,
        },
      });
    }
    caseNo++;
  }

  // ── Appointments ───────────────────────────────────────────
  const apptDate = new Date(); apptDate.setHours(11, 0, 0, 0);
  await dbA.appointment.upsert({
    where: { id: (await dbA.appointment.findFirst({ where: { tenantId: firmA.id } }))?.id ?? "none" },
    update: {},
    create: {
      tenantId: firmA.id,
      clientId: clientsA[0].id,
      staffId: ownerA.id,
      kind: AppointmentKind.IN_OFFICE,
      startAt: apptDate,
    },
  }).catch(() => { });

  // ── Public law catalogue (titles only; text is added from official sources) ──
  const laws: Array<[string, string, number, number]> = [
    ["العمل", "قانون العمل", 8, 1996],
    ["العقوبات والجزاء", "قانون العقوبات", 16, 1960],
    ["العقوبات والجزاء", "قانون أصول المحاكمات الجزائية", 9, 1961],
    ["العقوبات والجزاء", "قانون الجرائم الإلكترونية", 17, 2023],
    ["العقارات والإيجار", "قانون المالكين والمستأجرين", 11, 1994],
    ["المدني والإجراءات", "القانون المدني", 43, 1976],
    ["المدني والإجراءات", "قانون أصول المحاكمات المدنية", 24, 1988],
    ["المدني والإجراءات", "قانون التنفيذ", 25, 2007],
    ["التجارة والشركات", "قانون التجارة", 12, 1966],
    ["التجارة والشركات", "قانون الشركات", 22, 1997],
    ["الأحوال الشخصية", "قانون الأحوال الشخصية", 15, 2019],
    ["تنظيم المهنة", "قانون نقابة المحامين النظاميين", 11, 1972],
  ];
  for (const [category, title, number, year] of laws) {
    await prisma.publicLaw.upsert({ where: { title }, update: {}, create: { category, title, number, year } });
  }

  console.log("Seed complete:");
  console.log(`  - Tenants: ${firmA.subdomain} (demo-firm), ${firmB.subdomain} (solo-demo)`);
  console.log("  - Login: owner@demo-firm.example / Password123!");
  console.log("  - Login: lawyer@demo-firm.example / Password123!");
  console.log("  - Login: secretary@demo-firm.example / Password123!");
  console.log("  - Login: samer@solo-demo.example / Password123!");
  console.log("  - Client portal: client1@demo.example / Password123! (subdomain demo-firm)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
