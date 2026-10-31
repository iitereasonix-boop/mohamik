import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HukmWidget from "@/components/hukm/HukmWidget";

export default async function FirmHomePage({
  params,
}: {
  params: { subdomain: string };
}) {
  const firm = await prisma.tenant.findUnique({
    where: { subdomain: params.subdomain },
    select: {
      name: true,
      status: true,
      accentColor: true,
      logoUrl: true,
      siteCoverImageUrl: true,
      siteTagline: true,
      siteAbout: true,
      address: true,
      phone: true,
      email: true,
      practiceAreas: true,
    },
  });

  if (!firm || firm.status !== "ACTIVE") notFound();

  const accentColor = firm.accentColor ?? "#6b1e2e";
  const areaLabels: Record<string, string> = {
    CRIMINAL: "القضايا الجزائية",
    CIVIL: "القضايا المدنية",
    COMMERCIAL: "القضايا التجارية",
    LABOUR: "القضايا العمالية",
    FAMILY: "الأحوال الشخصية",
    REAL_ESTATE: "القضايا العقارية والإيجارات",
    COMPANIES: "قضايا الشركات",
    CYBERCRIME: "الجرائم الإلكترونية",
    ENFORCEMENT: "تنفيذ الأحكام",
    OTHER: "مجالات أخرى",
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="relative z-10 border-b border-paper-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={`/f/${params.subdomain}`} className="flex min-w-0 items-center gap-3">
            {firm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firm.logoUrl} alt="" className="h-11 max-w-32 object-contain" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white"
                style={{ backgroundColor: accentColor }}
              >
                ⚖
              </span>
            )}
            <span className="truncate font-arabic-heading text-lg font-bold sm:text-xl">
              {firm.name}
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-3 text-sm sm:gap-6">
            <Link
              href={`/login?subdomain=${encodeURIComponent(params.subdomain)}`}
              className="hidden text-warmgray-500 transition hover:text-ink sm:inline"
            >
              دخول المكتب
            </Link>
            <Link
              href={`/f/${params.subdomain}/portal`}
              className="hidden text-warmgray-500 transition hover:text-ink sm:inline"
            >
              بوابة العملاء
            </Link>
            <Link
              href={`/f/${params.subdomain}/portal/book`}
              className="rounded-md px-4 py-2 font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              احجز استشارة
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate min-h-[440px] overflow-hidden bg-ink text-white sm:min-h-[520px]">
        {firm.siteCoverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firm.siteCoverImageUrl}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink/95 via-ink/75 to-ink/45" />
        <div className="mx-auto flex min-h-[440px] max-w-7xl items-center px-5 py-16 sm:min-h-[520px] sm:px-8">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-paper-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-gold" />
              خدمات قانونية في الأردن
            </p>
            <h1 className="font-arabic-heading text-4xl font-bold leading-tight sm:text-6xl">
              {firm.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-paper-100 sm:text-xl">
              {firm.siteTagline || "خبرة قانونية ورعاية شخصية في كل خطوة."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/f/${params.subdomain}/portal/book`}
                className="rounded-md px-6 py-3 font-semibold text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                احجز موعدًا للاستشارة
              </Link>
              <Link
                href={`/f/${params.subdomain}/portal/consult`}
                className="rounded-md border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                أرسل طلبًا قانونيًا
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_0.8fr] lg:py-20">
        <div>
          <p className="text-sm font-bold" style={{ color: accentColor }}>
            من نحن
          </p>
          <h2 className="mt-2 font-arabic-heading text-3xl font-bold">
            شريكك القانوني في كل مرحلة
          </h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line leading-8 text-warmgray-500">
            {firm.siteAbout ||
              `يقدم ${firm.name} خدمات قانونية ومتابعة مهنية لعملائه. تواصل معنا للتعرّف على خدماتنا وترتيب استشارة.`}
          </p>

          {firm.practiceAreas.length > 0 && (
            <div className="mt-9">
              <h3 className="text-lg font-bold">مجالات العمل</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {firm.practiceAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-full border border-paper-200 bg-white px-4 py-2 text-sm"
                  >
                    {areaLabels[area] ?? area}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-paper-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold" style={{ color: accentColor }}>
            ابدأ من هنا
          </p>
          <h2 className="mt-2 text-2xl font-bold">كيف يمكننا مساعدتك؟</h2>
          <p className="mt-3 text-sm leading-7 text-warmgray-500">
            احجز استشارة أو أرسل تفاصيل طلبك إلى فريق المكتب. إذا كنت من عملائنا، سجّل الدخول إلى
            بوابتك الخاصة لمتابعة قضاياك ومستنداتك.
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              href={`/f/${params.subdomain}/portal/book`}
              className="rounded-md px-4 py-3 text-center font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              حجز موعد
            </Link>
            <Link href={`/f/${params.subdomain}/portal/consult`} className="btn-secondary text-center">
              طلب استشارة
            </Link>
            <Link href={`/f/${params.subdomain}/portal`} className="text-center text-sm underline">
              بوابة العملاء
            </Link>
          </div>
        </aside>
      </section>

      <footer className="border-t border-paper-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm sm:grid-cols-2 sm:px-8">
          <div>
            <p className="font-bold">{firm.name}</p>
            {firm.address && <p className="mt-2 text-warmgray-500">{firm.address}</p>}
          </div>
          <div className="sm:text-left">
            {firm.phone && <p className="tnum text-warmgray-500">{firm.phone}</p>}
            {firm.email && <p className="mt-1 text-warmgray-500">{firm.email}</p>}
          </div>
        </div>
        <p className="border-t border-paper-200 py-3 text-center text-xs text-warmgray-400">
          مدعوم من Mohamik
        </p>
      </footer>
      <HukmWidget
        firm={params.subdomain}
        firmName={firm.name}
        actions={[
          { label: "حجز موعد", href: `/f/${params.subdomain}/portal/book` },
          { label: "طلب استشارة", href: `/f/${params.subdomain}/portal/consult` },
          { label: "بوابة العملاء", href: `/f/${params.subdomain}/portal` },
        ]}
      />
    </main>
  );
}
