import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { chunkLegalText, normalizeArabic } from "@/lib/ai/arabic";

async function isPlatformAdmin() {
  const session = await getSession();
  return session?.user?.kind === "PLATFORM" && session.user.platformRole === "SUPER_ADMIN";
}

const schema = z.object({
  id: z.string().min(1).max(40).optional(),
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(200),
  number: z.number().int().positive().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  sourceUrl: z.string().trim().url().startsWith("https://").max(500).optional().or(z.literal("")),
  content: z.string().trim().max(1_500_000),
});

/** Create a law, or update one; its articles are rebuilt from the pasted text. */
export async function POST(request: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "طلب غير صالح." }, { status: 400 });
  const { id, content, ...d } = parsed.data;
  const chunks = content ? chunkLegalText(content) : [];
  const data = { ...d, number: d.number ?? null, year: d.year ?? null, sourceUrl: d.sourceUrl || null, content, articleCount: chunks.filter((c) => c.heading).length || chunks.length };

  const law = await prisma.$transaction(async (tx) => {
    const saved = id ? await tx.publicLaw.update({ where: { id }, data }) : await tx.publicLaw.create({ data });
    await tx.publicLawArticle.deleteMany({ where: { lawId: saved.id } });
    await tx.publicLawArticle.createMany({
      data: chunks.map((c, idx) => ({ lawId: saved.id, idx, heading: c.heading, text: c.text, norm: normalizeArabic(`${c.heading ?? ""} ${c.text}`) })),
    });
    return saved;
  }, { timeout: 60_000 });
  return NextResponse.json({ ok: true, id: law.id, articles: data.articleCount }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const removed = await prisma.publicLaw.deleteMany({ where: { id } });
  if (!removed.count) return NextResponse.json({ error: "القانون غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
