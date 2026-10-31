import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import LawsManager from "./LawsManager";

export const dynamic = "force-dynamic";

export default async function PlatformLawsPage() {
  const session = await getSession();
  if (session?.user?.kind !== "PLATFORM") redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/");
  const laws = await prisma.publicLaw.findMany({
    select: { id: true, category: true, title: true, number: true, year: true, sourceUrl: true, articleCount: true, content: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/platform" className="text-sm underline">العودة إلى لوحة المنصة</Link>
      <h1 className="mt-3 text-2xl font-bold">مكتبة القوانين الأردنية</h1>
      <p className="mb-6 mt-1 text-sm text-warmgray-500">تظهر للعامة في صفحة القوانين. انسخ النصوص من مصادر رسمية فقط.</p>
      <LawsManager laws={laws} />
    </main>
  );
}
