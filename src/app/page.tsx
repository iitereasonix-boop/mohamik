import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  FileLock2,
  Fingerprint,
  Globe2,
  KeyRound,
  Landmark,
  Scale,
  UserRound,
  MessagesSquare,
  Plus,
  ScrollText,
  ShieldCheck,
  Star,
  UsersRound,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import LuxEffects from "@/components/landing/LuxEffects";
import Seal from "@/components/landing/Seal";
import MohamikMark from "@/components/landing/MohamikMark";
import FirmCard, { AREA_LABELS, firmCardSelect, type FirmCardData } from "@/components/landing/FirmCard";
import LawsSearch from "@/components/landing/LawsSearch";
import HukmWidget from "@/components/hukm/HukmWidget";

export const revalidate = 300;

const features = [
  {
    icon: BriefcaseBusiness,
    title: "إدارة القضايا باحتراف",
    text: "كل قضية بملفها ومراحلها وجلساتها ومستنداتها وملاحظاتها، في لوحة واحدة تقرؤها بنظرة.",
    span: "lg:col-span-2",
  },
  {
    icon: Globe2,
    title: "موقع يحمل اسمك",
    text: "صفحة مكتبك بشعارك وألوانك ونطاقك الخاص، جاهزة لاستقبال العملاء.",
    span: "",
  },
  {
    icon: UsersRound,
    title: "بوابة عميل خاصة",
    text: "يتابع العميل قضيته ويحجز موعده ويطلب استشارته دون مكالمة واحدة.",
    span: "",
  },
  {
    icon: CalendarClock,
    title: "جلسات ومواعيد لا تُنسى",
    text: "تقويم موحّد للجلسات والمواعيد، وتنبيهات قبل كل استحقاق.",
    span: "",
  },
  {
    icon: KeyRound,
    title: "فريق بصلاحيات دقيقة",
    text: "شريك، محامٍ، متدرّب، سكرتارية — كلٌّ يرى ما يخصّه فقط.",
    span: "",
  },
  {
    icon: ScrollText,
    title: "سجل تدقيق كامل",
    text: "كل إجراء على المنصة موثّق بالوقت والمستخدم، لتبقى المساءلة واضحة دائمًا.",
    span: "lg:col-span-2",
  },
];

const verification = [
  ["01", "طلب الانضمام", "يُدخل المكتب بياناته ورقم عضوية نقابة المحامين للشريك المدير."],
  ["02", "التحقق اليدوي", "يراجع فريق Mohamik العضوية والترخيص والسجل التجاري قبل أي تفعيل."],
  ["03", "منح الشارة", "يحصل المكتب على شارة «مكتب موثّق» تظهر على موقعه وبوابة عملائه."],
  ["04", "انطلاق المكتب", "مساحة معزولة بالكامل، موقع خاص، وبوابة عملاء جاهزة للمشاركة."],
];

const plans = [
  {
    name: "منفرد",
    tier: "SOLO",
    tagline: "للمحامي المستقل الذي يبني اسمه",
    points: ["محامٍ واحد", "موقع شخصي بهويتك", "بوابة عملاء خاصة", "إدارة القضايا والمواعيد"],
    featured: false,
  },
  {
    name: "مكتب",
    tier: "FIRM",
    tagline: "للمكاتب التي تقود السوق",
    points: ["حتى 10 محامين", "صلاحيات وأدوار للفريق", "موقع المكتب ونطاق فرعي", "استقبال الاستشارات والحجوزات", "سجل تدقيق كامل"],
    featured: true,
  },
  {
    name: "مؤسسي",
    tier: "ENTERPRISE",
    tagline: "للمجموعات القانونية الكبرى",
    points: ["فروع متعددة", "دومين خاص بالمكتب", "عدد مستخدمين مرن", "أولوية في الدعم والتهيئة"],
    featured: false,
  },
];

const faqs = [
  [
    "كيف تضمن Mohamik أن المكاتب على المنصة حقيقية؟",
    "لا يُفعَّل أي مكتب قبل أن يراجع فريقنا رقم عضوية نقابة المحامين للشريك المدير وبيانات المكتب. المكاتب الموثّقة فقط تحصل على شارة «مكتب موثّق».",
  ],
  [
    "هل يستطيع مكتب آخر رؤية بيانات مكتبي أو عملائي؟",
    "لا. لكل مكتب مساحة مستقلة، وكل طلب على المنصة مقيّد ببيانات المكتب صاحب الحساب فقط، ولا تمر أي بيانات بين المكاتب. حتى داخل المكتب، يرى كل عضو ما تسمح به صلاحياته فقط.",
  ],
  [
    "هل أحتاج خبرة تقنية لإنشاء موقع مكتبي؟",
    "إطلاقًا. ترفع الشعار، تختار اللون، تكتب نبذة المكتب ومجالات العمل، ويصبح موقعك جاهزًا برابط خاص تشاركه مع عملائك.",
  ],
  [
    "ماذا يرى العميل في بوابته؟",
    "يرى قضاياه والتحديثات التي يشاركها المكتب معه، ويحجز المواعيد ويطلب الاستشارات — دون أن يطّلع على ملاحظات المكتب الداخلية.",
  ],
];

async function getFirms(): Promise<FirmCardData[]> {
  try {
    return await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: firmCardSelect,
      orderBy: [{ demo: "asc" }, { createdAt: "asc" }],
      take: 6,
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const firms = await getFirms();
  const areas = Object.values(AREA_LABELS);

  return (
    <main className="lux relative min-h-screen overflow-x-clip font-arabic-body">
      <LuxEffects />
      <HukmWidget actions={[{ label: "ابحث عن مكتب محاماة", href: "/firms" }, { label: "القوانين الأردنية", href: "/laws" }, { label: "سجّل مكتبك", href: "/register-firm" }]} />

      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0b1626]">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-[70px]">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="whitespace-nowrap rounded-xl bg-[#d9b27a] px-4 py-2.5 text-sm font-bold text-[#0b1626] transition hover:bg-[#e6c594] sm:px-6 sm:py-3">
              تسجيل الدخول
            </Link>
            <a href="#join" className="whitespace-nowrap rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#d9b27a] hover:text-[#f1dfb3] sm:px-6 sm:py-3">
              إنشاء حساب
            </a>
          </div>
          <nav className="hidden h-full items-center gap-9 text-sm text-white/90 lg:flex">
            <Link href="/" className="flex h-full items-center border-b-2 border-[#d9b27a] font-semibold text-[#e6c594]">الرئيسية</Link>
            <a href="#firms" className="transition hover:text-[#e6c594]">المكاتب</a>
            <Link href="/laws" className="transition hover:text-[#e6c594]">القوانين</Link>
            <a href="#platform" className="transition hover:text-[#e6c594]">الخدمات</a>
            <a href="#verified" className="transition hover:text-[#e6c594]">عن المنصة</a>
            <a href="#join" className="transition hover:text-[#e6c594]">تواصل معنا</a>
          </nav>
          <Link href="/" dir="ltr" className="flex items-center gap-3">
            <MohamikMark size={40} />
            <span className="hidden font-arabic-heading text-3xl font-bold leading-none text-white sm:block">Mohamik</span>
          </Link>
        </div>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative isolate">
        <div className="relative isolate overflow-hidden bg-[#0b1626]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-gavel.jpg" alt="" className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-right opacity-40 md:w-[62%] md:opacity-100 md:[mask-image:linear-gradient(to_left,black_72%,transparent)]" />
          <div className="mx-auto flex max-w-[1400px] justify-center px-4 pb-24 pt-12 sm:px-6 md:justify-end md:pb-28 lg:px-[70px]">
            <div className="flex w-full max-w-[460px] flex-col items-center text-center md:ml-[3%] lg:ml-[10%]">
              <MohamikMark size={80} className="reveal" />
              <p dir="ltr" className="reveal mt-2 font-arabic-heading text-6xl font-bold leading-tight text-white" style={{ "--d": "80ms" } as React.CSSProperties}>Mohamik</p>
              <h1 className="reveal mt-1 text-2xl font-medium leading-relaxed text-white" style={{ "--d": "160ms" } as React.CSSProperties}>منصة تجمعك مع أفضل مكاتب المحاماة</h1>
              <p className="reveal mt-4 text-base leading-8 text-white/90" style={{ "--d": "240ms" } as React.CSSProperties}>
                ابحث عن محامٍ مناسب، تواصل مع المكتب مباشرة،
                <span className="block">واحصل على الدعم القانوني الذي تحتاجه بسهولة وأمان.</span>
              </p>
              <div className="reveal mt-7 flex flex-wrap items-center justify-center gap-4" style={{ "--d": "320ms" } as React.CSSProperties}>
                <a href="#join" className="inline-flex items-center gap-2 rounded-xl bg-[#d9b27a] px-10 py-3.5 text-sm font-bold text-[#0b1626] transition hover:bg-[#e6c594]">
                  ابدأ الآن <ArrowLeft size={16} />
                </a>
                <Link href="/firms" className="rounded-xl border border-white/60 px-10 py-3.5 text-sm font-semibold text-white transition hover:border-[#d9b27a] hover:text-[#f1dfb3]">
                  تصفح المكاتب
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-12 max-w-[1400px] px-4 sm:px-6 lg:px-[70px]">
          <div className="grid grid-cols-2 rounded-2xl border border-white/[0.06] bg-[#0f1b2d] py-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] lg:grid-cols-4">
            {[
              [Scale, "تسهيل الإجراءات", "وفّر وقتك وجهدك"],
              [Zap, "تواصل مباشر", "تواصل مع المحامي أو المكتب مباشرة"],
              [UsersRound, "مكاتب موثوقة", "مكاتب موثّقة بعضوية نقابة المحامين"],
              [ShieldCheck, "أمان وخصوصية", "بياناتك خاصة بك وبمكتبك"],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof Scale;
              return (
                <div key={title as string} className={`flex flex-col items-center px-4 py-3 text-center ${i ? "lg:border-r lg:border-white/10" : ""}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white"><I size={21} strokeWidth={1.7} /></span>
                  <p className="mt-3 font-bold text-white">{title as string}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{text as string}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* practice areas marquee */}
        <div className="relative mt-10 border-y border-white/[0.06] bg-white/[0.015] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="lux-marquee gap-12 pl-12">
            {[...areas, ...areas].map((area, i) => (
              <span key={i} className="flex shrink-0 items-center gap-12 font-arabic-heading text-xl text-[color:var(--lux-ivory)]/70 sm:text-2xl">
                {area}
                <span className="text-sm text-[color:var(--lux-gold)]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Participating firms (light) ───────────────────────── */}
      <section id="firms" className="relative scroll-mt-24 bg-[#f7f4ee] py-24 text-[#0f1c36]">
        <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="reveal flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[#9a7436]">
                <span className="h-px w-8 bg-[#b08d57]" /> مكاتب موثّقة
              </p>
              <h2 className="mt-4 font-arabic-heading text-4xl font-bold sm:text-5xl">مكاتب المحاماة المشاركة</h2>
              <p className="mt-3 max-w-xl leading-8 text-[#0f1c36]/60">اختر المكتب المناسب لك، واحصل على حسابك الخاص في بوابته.</p>
            </div>
            <Link href="/firms" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#0f1c36]/15 bg-white px-5 py-2.5 text-sm font-semibold transition hover:gap-3 hover:border-[#b08d57]">
              كل المكاتب <ArrowLeft size={15} />
            </Link>
          </div>
          <div className={`mt-12 grid gap-5 sm:grid-cols-2 ${["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"][Math.min(firms.length, 3)]}`}>
            {firms.slice(0, 3).map((firm, i) => (
              <FirmCard key={firm.subdomain} firm={firm} delay={i * 90} />
            ))}
            <div className={`reveal relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0f1c36] p-8 text-[color:var(--lux-ivory)] lg:col-span-1 ${firms.length % 2 === 0 ? "sm:col-span-2" : ""}`} style={{ "--d": "270ms" } as React.CSSProperties}>
              <div aria-hidden className="absolute -left-16 -top-16 opacity-40"><Seal size={240} animated={false} /></div>
              <div className="relative">
                <Scale size={34} strokeWidth={1.5} className="text-[color:var(--lux-gold)]" />
                <p className="mt-6 font-arabic-heading text-3xl font-bold leading-snug">
                  مع Mohamik..
                  <span className="block text-gold">الحق أقرب إليك.</span>
                </p>
              </div>
              <a href="#join" className="relative mt-10 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--lux-gold)]/50 px-5 py-2.5 text-sm font-semibold text-[color:var(--lux-gold-soft)] transition hover:bg-[color:var(--lux-gold)]/10">
                ابدأ الآن <ArrowLeft size={15} />
              </a>
            </div>
          </div>
          {firms.length === 0 && (
            <p className="mt-6 text-sm text-[#0f1c36]/50">ستظهر المكاتب هنا فور تفعيلها بعد التحقق.</p>
          )}
        </div>
      </section>

      {/* ───────────────────────── Jordanian laws ───────────────────────── */}
      <section id="laws" className="scroll-mt-24">
        <LawsSearch />
      </section>

      {/* ───────────────────────── Pillars ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["١٠", "مجالات قانونية", "من الجزائي إلى الشركات والتنفيذ"],
            ["١٠٠٪", "عزل البيانات", "مساحة مستقلة لكل مكتب"],
            ["٢٤/٧", "بوابة العميل", "متابعة وحجز في أي وقت"],
            ["٣", "باقات مرنة", "من المحامي المنفرد إلى المجموعات"],
          ].map(([value, label, hint], i) => (
            <div key={label} className="reveal bg-[#0a1428] p-8 text-center" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <p className="font-arabic-heading text-5xl font-bold text-gold sm:text-6xl">{value}</p>
              <p className="mt-3 font-semibold">{label}</p>
              <p className="mt-1 text-sm text-[color:var(--lux-muted)]">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Platform bento ───────────────────────── */}
      <section id="platform" className="relative mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 sm:px-6">
        <SectionHead
          eyebrow="منصة متكاملة"
          title={<>كل ما يحتاجه مكتب <span className="text-gold">من الطراز الأول</span></>}
          text="من لحظة تواصل العميل الأولى، حتى صدور الحكم وتنفيذه — تجربة واحدة مترابطة بإتقان."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, span }, i) => (
            <article
              key={title}
              className={`reveal lux-spot lux-frame group relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 transition duration-500 hover:-translate-y-1 sm:p-8 ${span}`}
              style={{ "--d": `${(i % 3) * 100}ms` } as React.CSSProperties}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--lux-gold)]/25 bg-[color:var(--lux-gold)]/[0.08] text-[color:var(--lux-gold-soft)] transition duration-500 group-hover:scale-110">
                <Icon size={22} strokeWidth={1.6} />
              </span>
              <h3 className="mt-7 font-arabic-heading text-2xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-[color:var(--lux-muted)]">{text}</p>
              <span aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full border border-[color:var(--lux-gold)]/10 transition duration-700 group-hover:scale-125" />
            </article>
          ))}
        </div>

        <div className="reveal lux-frame mt-4 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-[linear-gradient(110deg,rgba(212,175,106,0.12),rgba(212,175,106,0.02)_55%)] p-7 sm:flex-row sm:items-center sm:p-9">
          <div className="flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold"><MessagesSquare size={24} /></span>
            <div>
              <p className="flex flex-wrap items-center gap-3 font-arabic-heading text-2xl font-bold">
                «حُكم» — المساعد القانوني الذكي
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 font-arabic-body text-[11px] font-semibold text-emerald-300"><span className="lux-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />متاح الآن</span>
              </p>
              <p className="mt-2 max-w-2xl leading-7 text-[color:var(--lux-muted)]">
                اسأله عن أي عميل أو قضية فيجيبك من ملفات مكتبك، وناقش معه قضاياك، واستشهد بالقوانين التي تضيفها لمكتبتك — مع مرجع لكل معلومة، ودون أن يخرج عن مساحة مكتبك.
              </p>
            </div>
          </div>
          <Link href="/register-firm" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[color:var(--lux-gold-soft)] transition hover:gap-3">
            ابدأ مع «حُكم» <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {/* ───────────────────────── Verification ───────────────────────── */}
      <section id="verified" className="lux-grain relative isolate scroll-mt-28 overflow-hidden border-y border-white/[0.06] bg-[#0c1730] py-24">
        <div aria-hidden className="lux-lattice absolute inset-0 -z-10 opacity-[0.04]" />
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
          <div className="reveal relative mx-auto flex w-full max-w-[460px] items-center justify-center">
            <div aria-hidden className="absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.25),transparent_65%)] blur-2xl" />
            <Seal size={460} />
          </div>
          <div>
            <SectionHead
              align="start"
              eyebrow="الاعتماد والثقة"
              title={<>شارة <span className="text-gold">«مكتب موثّق»</span> لا تُمنح إلا لمن يستحقها</>}
              text="نبني أكبر مجتمع من المحامين الموثّقين في المنطقة — وكل عضو فيه مرّ بالتحقق نفسه، ليعرف العميل أنه بين أيدٍ أمينة."
            />
            <ol className="relative mt-10 space-y-3">
              <span aria-hidden className="absolute bottom-6 right-[1.6rem] top-6 w-px bg-gradient-to-b from-[color:var(--lux-gold)]/60 via-[color:var(--lux-gold)]/20 to-transparent" />
              {verification.map(([n, title, text], i) => (
                <li key={n} className="reveal relative flex gap-5 rounded-2xl p-3 transition hover:bg-white/[0.025]" style={{ "--d": `${i * 110}ms` } as React.CSSProperties}>
                  <span className="lux-frame relative z-10 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-[#0f1c36] font-arabic-heading text-lg font-bold text-gold">
                    {n}
                  </span>
                  <span className="pt-1">
                    <span className="block text-lg font-bold">{title}</span>
                    <span className="mt-1 block leading-7 text-[color:var(--lux-muted)]">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>


      {/* ───────────────────────── Security ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="reveal lux-frame relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,#13234a,#0a1428)] p-8 sm:p-14">
          <div aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.18),transparent_65%)]" />
          <div className="relative grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold tracking-[0.25em] text-[color:var(--lux-gold)]">سرّية المهنة</p>
              <h2 className="mt-4 font-arabic-heading text-4xl font-bold leading-tight sm:text-5xl">
                أسرار موكّليك
                <span className="block text-gold">في خزنة لا تُفتح.</span>
              </h2>
              <p className="mt-5 leading-8 text-[color:var(--lux-muted)]">
                السرّية ليست ميزة إضافية في مهنة المحاماة، بل أساسها. لذلك بُنيت Mohamik بحيث يكون الفصل بين المكاتب وبين العملاء جزءًا من كل طلب على الخادم، لا مجرد إخفاء في الواجهة.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [Building2, "فصل تام بين المكاتب", "كل استعلام مقيّد بمساحة المكتب، ويُتحقق منه على الخادم."],
                [Fingerprint, "رابط خاص لكل مكتب", "يدخل العميل من بوابة مكتبه فقط، وحسابه مرتبط بهذا المكتب وحده."],
                [FileLock2, "ملفات خاصة بالقضية", "المستندات مرتبطة بقضيتها ومن يملك صلاحيتها."],
                [ScrollText, "سجل تدقيق لا يُمحى", "كل دخول وتعديل مسجّل بالوقت والمستخدم."],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof Building2;
                return (
                  <div key={title as string} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <I size={22} strokeWidth={1.6} className="text-[color:var(--lux-gold-soft)]" />
                    <p className="mt-4 font-bold">{title as string}</p>
                    <p className="mt-1.5 text-sm leading-6 text-[color:var(--lux-muted)]">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Plans ───────────────────────── */}
      <section id="plans" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 sm:px-6">
        <SectionHead
          eyebrow="الباقات"
          title={<>باقة لكل <span className="text-gold">طموح</span></>}
          text="ابدأ بما يناسب مكتبك اليوم، وانتقل للباقة الأكبر متى كبر فريقك — دون أن تفقد أي بيانات."
        />
        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={plan.tier}
              className={`reveal lux-spot relative flex flex-col rounded-[1.75rem] p-8 ${plan.featured
                ? "bg-[linear-gradient(170deg,rgba(212,175,106,0.18),rgba(212,175,106,0.03)_60%)] shadow-[0_30px_90px_-30px_rgba(212,175,106,0.35)] lux-frame lg:-my-4 lg:py-12"
                : "lux-frame bg-white/[0.02]"
                }`}
              style={{ "--d": `${i * 110}ms` } as React.CSSProperties}
            >
              {plan.featured && (
                <span className="bg-gold absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold">
                  <Star size={12} fill="currentColor" /> الأكثر اختيارًا
                </span>
              )}
              <p className="text-xs tracking-[0.3em] text-[color:var(--lux-muted)]">{plan.tier}</p>
              <h3 className={`mt-2 font-arabic-heading text-4xl font-bold ${plan.featured ? "text-gold" : ""}`}>{plan.name}</h3>
              <p className="mt-2 text-sm text-[color:var(--lux-muted)]">{plan.tagline}</p>
              <div className="my-7 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" />
              <ul className="space-y-3.5 text-sm">
                {plan.points.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--lux-gold)]/15 text-[color:var(--lux-gold-soft)]"><Check size={12} strokeWidth={3} /></span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/register-firm"
                className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold transition ${plan.featured ? "bg-gold" : "border border-white/10 hover:border-[color:var(--lux-gold)]/50 hover:bg-white/[0.04]"
                  } ${plan.featured ? "mt-10" : "mt-10"}`}
              >
                اطلب الانضمام <ArrowLeft size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Manifesto ───────────────────────── */}
      <section className="relative mx-auto max-w-5xl px-4 pb-24 text-center sm:px-6">
        <div className="reveal">
          <span className="font-arabic-heading text-7xl leading-none text-gold">”</span>
          <blockquote className="-mt-6 font-arabic-heading text-3xl font-bold leading-[1.6] sm:text-[2.6rem]">
            المحاماة مهنة الثقة قبل أن تكون مهنة القانون.
            <span className="block text-[color:var(--lux-muted)]">ونحن بنينا المنصة التي تحفظ هذه الثقة.</span>
          </blockquote>
          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-l from-transparent via-[color:var(--lux-gold)] to-transparent" />
          <p className="mt-4 text-sm tracking-[0.2em] text-[color:var(--lux-muted)]">فريق Mohamik</p>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section id="faq" className="mx-auto max-w-4xl scroll-mt-28 px-4 pb-24 sm:px-6">
        <SectionHead eyebrow="أسئلة شائعة" title={<>قبل أن <span className="text-gold">تنضم</span></>} />
        <div className="mt-12 space-y-3">
          {faqs.map(([q, a], i) => (
            <details key={q} className="reveal lux-faq lux-frame group rounded-2xl bg-white/[0.02] open:bg-white/[0.04]" style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 text-base font-semibold sm:text-lg">
                {q}
                <span className="lux-faq-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--lux-gold)]/30 text-[color:var(--lux-gold-soft)] transition-transform duration-300">
                  <Plus size={16} />
                </span>
              </summary>
              <p className="px-6 pb-6 leading-8 text-[color:var(--lux-muted)]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Create account ───────────────────────── */}
      <section id="join" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 sm:px-6">
        <SectionHead eyebrow="إنشاء حساب" title={<>كيف تريد أن <span className="text-gold">تنضم؟</span></>} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            {
              icon: UserRound,
              who: "أنا عميل",
              title: "أبحث عن مكتب محاماة",
              text: "اختر المكتب، وأنشئ حسابك من رابط بوابته الخاص. حسابك مرتبط بهذا المكتب وحده، ولا يرى قضاياك أحد سواه.",
              steps: ["اختر مكتبك", "أنشئ حسابك من بوابته", "تابع قضيتك ومواعيدك"],
              href: "/firms",
              cta: "اختر مكتبك",
            },
            {
              icon: Landmark,
              who: "أنا محامٍ",
              title: "أريد تسجيل مكتبي",
              text: "قدّم طلب الانضمام برقم عضوية النقابة. بعد التحقق يحصل مكتبك على موقعه ورابط بوابة خاص يشاركه مع عملائه.",
              steps: ["قدّم طلب الانضمام", "نتحقق من العضوية", "شارك رابط بوابتك"],
              href: "/register-firm",
              cta: "سجّل مكتبك",
            },
          ].map(({ icon: Icon, who, title, text, steps: list, href, cta }, i) => (
            <div key={who} className="reveal lux-spot lux-frame flex flex-col rounded-[1.75rem] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 sm:p-10" style={{ "--d": `${i * 120}ms` } as React.CSSProperties}>
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold"><Icon size={24} /></span>
                <div>
                  <p className="text-sm text-[color:var(--lux-gold)]">{who}</p>
                  <h3 className="font-arabic-heading text-2xl font-bold sm:text-3xl">{title}</h3>
                </div>
              </div>
              <p className="mt-6 leading-8 text-[color:var(--lux-muted)]">{text}</p>
              <ol className="mt-6 space-y-2.5">
                {list.map((step, n) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="tnum flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--lux-gold)]/40 text-xs text-[color:var(--lux-gold-soft)]">{n + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link href={href} className={`mt-9 inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3.5 font-bold ${i === 0 ? "bg-gold" : "border border-white/15 transition hover:border-[color:var(--lux-gold)]/60 hover:bg-white/[0.04]"}`}>
                {cta} <ArrowLeft size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="reveal lux-grain lux-frame relative isolate overflow-hidden rounded-[2.25rem] px-6 py-20 text-center sm:px-12 sm:py-24">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,106,0.28),transparent_60%),linear-gradient(180deg,#13234a,#0a1428)]" />
          <div aria-hidden className="lux-lattice absolute inset-0 -z-10 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <p className="text-sm tracking-[0.25em] text-[color:var(--lux-gold)]">انضم إلى نخبة المحامين</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-arabic-heading text-4xl font-bold leading-tight sm:text-6xl">
            اسم مكتبك يستحق
            <span className="block text-gold">منصة بهذا المستوى.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl leading-8 text-[color:var(--lux-muted)]">
            أرسل طلب الانضمام اليوم، ويتولى فريقنا التحقق والتفعيل. خلال وقت قصير يكون موقعك وبوابة عملائك جاهزين.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register-firm" className="bg-gold group inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold">
              سجّل مكتبك الآن
              <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
            <Link href="/login" className="lux-frame inline-flex items-center rounded-2xl bg-white/[0.03] px-8 py-4 font-semibold transition hover:bg-white/[0.07]">
              لدي حساب
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-gold flex h-11 w-11 items-center justify-center rounded-xl"><Scale size={22} strokeWidth={1.8} /></span>
              <span className="font-arabic-heading text-2xl font-bold text-gold">Mohamik</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[color:var(--lux-muted)]">
              منصة المحامين الموثّقة: إدارة المكتب، موقع بهويته، وبوابة خاصة لعملائه — بخصوصية تليق بالمهنة.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">المنصة</p>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--lux-muted)]">
              <li><Link href="/firms" className="transition hover:text-[color:var(--lux-gold-soft)]">مكاتب المحاماة</Link></li>
              <li><a href="#platform" className="transition hover:text-[color:var(--lux-gold-soft)]">المزايا</a></li>
              <li><a href="#verified" className="transition hover:text-[color:var(--lux-gold-soft)]">الاعتماد</a></li>
              <li><a href="#plans" className="transition hover:text-[color:var(--lux-gold-soft)]">الباقات</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">الحساب</p>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--lux-muted)]">
              <li><Link href="/register-firm" className="transition hover:text-[color:var(--lux-gold-soft)]">تسجيل مكتب</Link></li>
              <li><Link href="/login" className="transition hover:text-[color:var(--lux-gold-soft)]">تسجيل الدخول</Link></li>
              <li><a href="#faq" className="transition hover:text-[color:var(--lux-gold-soft)]">الأسئلة الشائعة</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-[color:var(--lux-muted)] sm:px-6">
            <span>© {new Date().getFullYear()} Mohamik. جميع الحقوق محفوظة.</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-[color:var(--lux-gold)]" /> كل مكتب موثّق · كل بيان محمي</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionHead({
  eyebrow,
  title,
  text,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  text?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={`reveal ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-xl"}`}>
      <p className={`flex items-center gap-3 text-sm font-semibold tracking-[0.25em] text-[color:var(--lux-gold)] ${align === "center" ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-[color:var(--lux-gold)]/60" />
        {eyebrow}
        <span className="h-px w-8 bg-[color:var(--lux-gold)]/60" />
      </p>
      <h2 className="mt-5 font-arabic-heading text-4xl font-bold leading-[1.35] sm:text-5xl">{title}</h2>
      {text && <p className="mt-5 text-base leading-8 text-[color:var(--lux-muted)] sm:text-lg">{text}</p>}
    </div>
  );
}
