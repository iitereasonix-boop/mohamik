import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  CalendarPlus,
  FolderOpen,
  Gavel,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { withTenant } from "@/lib/tenant";
import { APPT_KIND_AR, APPT_STATUS_AR, fmtDate, fmtDateTime, getPortal } from "@/lib/portal";
import { Empty, Panel } from "@/components/portal/ui";

export default async function PortalHomePage({ params }: { params: { subdomain: string } }) {
  const { firm, client } = await getPortal(params.subdomain);
  const base = `/f/${firm.subdomain}/portal`;

  if (!client) return <GuestHome firmName={firm.name} base={base} subdomain={firm.subdomain} />;

  const now = new Date();
  const [cases, nextHearing, appointments, updates] = await withTenant(firm.id, (tx) =>
    Promise.all([
      tx.case.findMany({ where: { tenantId: firm.id, clientId: client.id }, select: { status: true } }),
      tx.hearing.findFirst({
        where: { visibleToClient: true, date: { gte: now }, case: { tenantId: firm.id, clientId: client.id } },
        orderBy: { date: "asc" },
        select: { date: true, court: true, room: true, case: { select: { id: true, title: true } } },
      }),
      tx.appointment.findMany({
        where: { tenantId: firm.id, clientId: client.id, startAt: { gte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        orderBy: { startAt: "asc" },
        take: 4,
        select: { id: true, startAt: true, kind: true, status: true },
      }),
      tx.clientUpdate.findMany({
        where: { tenantId: firm.id, approved: true, case: { clientId: client.id } },
        orderBy: { sentAt: "desc" },
        take: 4,
        select: { id: true, body: true, sentAt: true, case: { select: { id: true, title: true } } },
      }),
    ])
  );
  const activeCases = cases.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1c36] p-7 text-white sm:p-10">
        <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.25),transparent_65%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-sm text-[#d4af6a]">أهلاً بك</p>
            <h1 className="mt-2 font-arabic-heading text-3xl font-bold sm:text-4xl">{client.name}</h1>
            <p className="mt-3 max-w-md leading-7 text-white/65">هنا تجد كل ما يخص قضاياك ومواعيدك مع {firm.name}، محدّثًا أولًا بأول.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["قضايا نشطة", activeCases],
              ["كل القضايا", cases.length],
              ["مواعيد قادمة", appointments.length],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="tnum font-arabic-heading text-3xl font-bold text-gold">{value as number}</p>
                <p className="mt-1 text-xs text-white/60">{label as string}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <Panel title="الجلسة القادمة" icon={<Gavel size={18} />}>
            {nextHearing ? (
              <Link href={`${base}/cases/${nextHearing.case.id}`} className="group flex items-center gap-5 rounded-2xl bg-[#fbf9f4] p-5 ring-1 ring-[#b08d57]/20 transition hover:ring-[#b08d57]/50">
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#0f1c36] text-white">
                  <span className="tnum font-arabic-heading text-3xl font-bold text-[#f1dfb3]">{nextHearing.date.getDate()}</span>
                  <span className="text-[11px] text-white/60">{new Intl.DateTimeFormat("ar-JO", { month: "long" }).format(nextHearing.date)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{nextHearing.case.title}</p>
                  <p className="mt-1 text-sm text-[#0f1c36]/60">{nextHearing.court}{nextHearing.room ? ` · قاعة ${nextHearing.room}` : ""}</p>
                  <p className="tnum mt-1 text-sm font-semibold text-[#9a7436]">{fmtDateTime(nextHearing.date)}</p>
                </div>
                <ArrowLeft size={18} className="shrink-0 text-[#0f1c36]/30 transition group-hover:-translate-x-1 group-hover:text-[#9a7436]" />
              </Link>
            ) : (
              <Empty icon={<Gavel size={26} />} text="لا توجد جلسات قادمة حاليًا." />
            )}
          </Panel>

          <Panel title="آخر التحديثات من المكتب" icon={<BellRing size={18} />}>
            {updates.length === 0 ? (
              <Empty icon={<BellRing size={26} />} text="ستظهر هنا التحديثات التي يرسلها لك المحامي." />
            ) : (
              <ul className="space-y-3">
                {updates.map((u) => (
                  <li key={u.id}>
                    <Link href={`${base}/cases/${u.case.id}`} className="block rounded-2xl border border-[#0f1c36]/[0.06] p-4 transition hover:border-[#b08d57]/40 hover:bg-[#fbf9f4]">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-semibold text-[#9a7436]">{u.case.title}</span>
                        {u.sentAt && <span className="tnum shrink-0 text-[#0f1c36]/45">{fmtDate(u.sentAt)}</span>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-7">{u.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="مواعيدي القادمة" icon={<CalendarClock size={18} />} action={<Link href={`${base}/book`} className="text-sm font-semibold text-[#9a7436] hover:underline">حجز موعد</Link>}>
            {appointments.length === 0 ? (
              <Empty icon={<CalendarClock size={26} />} text="لا توجد مواعيد قادمة." />
            ) : (
              <ul className="divide-y divide-[#0f1c36]/[0.06]">
                {appointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                    <span>
                      <span className="tnum block text-sm font-semibold">{fmtDateTime(a.startAt)}</span>
                      <span className="text-xs text-[#0f1c36]/55">{APPT_KIND_AR[a.kind] ?? a.kind}</span>
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {APPT_STATUS_AR[a.status] ?? a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="إجراءات سريعة">
            <div className="grid gap-3">
              <QuickAction href={`${base}/cases`} icon={<FolderOpen size={19} />} title="قضاياي" text="الجلسات والتحديثات والمستندات" />
              <QuickAction href={`${base}/book`} icon={<CalendarPlus size={19} />} title="حجز موعد" text="في المكتب، هاتفيًا أو مرئيًا" />
              <QuickAction href={`${base}/consult`} icon={<MessageSquarePlus size={19} />} title="طلب استشارة" text="اشرح موضوعك ليصل للفريق المختص" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-[#0f1c36]/[0.06] p-4 transition hover:border-[#b08d57]/40 hover:bg-[#fbf9f4]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f1c36] text-[#f1dfb3]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block truncate text-xs text-[#0f1c36]/55">{text}</span>
      </span>
      <ArrowLeft size={16} className="shrink-0 text-[#0f1c36]/30 transition group-hover:-translate-x-1 group-hover:text-[#9a7436]" />
    </Link>
  );
}

function GuestHome({ firmName, base, subdomain }: { firmName: string; base: string; subdomain: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#9a7436] ring-1 ring-[#b08d57]/25">
          <ShieldCheck size={14} /> بوابة خاصة وآمنة
        </p>
        <h1 className="mt-5 font-arabic-heading text-4xl font-bold sm:text-5xl">مرحبًا بك في بوابة {firmName}</h1>
        <p className="mx-auto mt-4 max-w-xl leading-8 text-[#0f1c36]/60">احجز موعدك، اطلب استشارة، أو تابع قضيتك في أي وقت — من مكان واحد.</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { href: `${base}/book`, icon: <CalendarPlus size={24} />, title: "حجز موعد", text: "اختر نوع الموعد واليوم المناسب لك." },
          { href: `${base}/consult`, icon: <MessageSquarePlus size={24} />, title: "طلب استشارة", text: "اشرح موضوعك وسيصل إلى الفريق المختص." },
          { href: `${base}/cases`, icon: <FolderOpen size={24} />, title: "قضاياي", text: "تابع جلساتك وتحديثات قضيتك ومستنداتك." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-3xl border border-[#0f1c36]/[0.07] bg-white p-7 shadow-[0_10px_30px_-20px_rgba(15,28,54,0.25)] transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-28px_rgba(15,28,54,0.35)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f1c36] text-[#f1dfb3]">{c.icon}</span>
            <h2 className="mt-6 text-xl font-bold">{c.title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#0f1c36]/60">{c.text}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9a7436] transition-all group-hover:gap-3">ابدأ <ArrowLeft size={15} /></span>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl bg-[#0f1c36] p-7 text-white sm:flex-row sm:p-8">
        <div>
          <p className="font-arabic-heading text-2xl font-bold">عميل لدى المكتب؟</p>
          <p className="mt-1 text-sm text-white/60">أنشئ حسابك الخاص لتتابع قضاياك وتحديثاتها.</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/login?subdomain=${encodeURIComponent(subdomain)}`} className="rounded-xl border border-white/20 px-5 py-3 font-semibold transition hover:border-[#d4af6a]/60">تسجيل الدخول</Link>
          <Link href={`${base}/register`} className="bg-gold rounded-xl px-5 py-3 font-bold">إنشاء حساب</Link>
        </div>
      </div>
    </div>
  );
}
