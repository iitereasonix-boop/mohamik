import Link from "next/link";
import { getPortal } from "@/lib/portal";

export default async function PortalSuccessPage({ params }: { params: { subdomain: string } }) {
  const { firm } = await getPortal(params.subdomain);
  const base = `/f/${firm.subdomain}/portal`;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-3xl border border-[#0f1c36]/[0.07] bg-white p-9 text-center shadow-[0_20px_60px_-30px_rgba(15,28,54,0.35)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">✓</span>
        <h1 className="mt-6 font-arabic-heading text-3xl font-bold">تم إرسال طلبك</h1>
        <p className="mt-3 text-sm leading-7 text-[#0f1c36]/60">وصل طلبك إلى {firm.name}، وسيتواصل معك المكتب قريبًا.</p>
        <Link href={base} className="bg-gold mt-7 inline-block rounded-xl px-6 py-3.5 font-bold">العودة إلى البوابة</Link>
      </div>
    </div>
  );
}
