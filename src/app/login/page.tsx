"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, LockKeyhole } from "lucide-react";
import Seal from "@/components/landing/Seal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  // set when the visitor arrives from a firm's own portal link (?subdomain=...)
  const [firmFromLink, setFirmFromLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("subdomain")?.trim().toLowerCase();
    if (fromLink) {
      setFirmFromLink(fromLink);
      setSubdomain(fromLink);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loginSubdomain = firmFromLink || subdomain.trim().toLowerCase();
      const result = await signIn("credentials", {
        email,
        password,
        subdomain: loginSubdomain,
        redirect: false,
      });
      if (result?.error) {
        setError("بيانات الدخول غير صحيحة أو الحساب غير مفعّل.");
        return;
      }

      const response = await fetch("/api/auth/session");
      if (!response.ok) {
        setError("تم التحقق من الحساب لكن تعذّر فتح الجلسة. حاول مرة أخرى.");
        return;
      }
      const session = await response.json();
      const destination =
        session?.user?.kind === "PLATFORM"
          ? "/platform"
          : session?.user?.kind === "CLIENT" && session.user.subdomain
            ? `/f/${encodeURIComponent(session.user.subdomain)}/portal/cases`
            : "/admin";
      router.push(destination);
      router.refresh();
    } catch {
      setError("تعذّر تسجيل الدخول بسبب مشكلة في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[color:var(--lux-ivory)] outline-none transition placeholder:text-white/25 focus:border-[color:var(--lux-gold)]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[color:var(--lux-gold)]/10";

  return (
    <main className="lux lux-grain relative isolate grid min-h-screen overflow-hidden font-arabic-body lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="lux-aurora absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.22),transparent_62%)] blur-2xl" />
        <div className="lux-aurora absolute bottom-[-25%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(56,78,128,0.3),transparent_62%)] blur-2xl" />
      </div>

      {/* brand side */}
      <section className="relative hidden flex-col justify-between border-l border-white/[0.06] p-12 lg:flex">
        <div aria-hidden className="lux-lattice absolute inset-0 -z-10 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <Link href="/" className="font-arabic-heading text-2xl font-bold text-gold">Mohamik</Link>
        <div className="mx-auto flex flex-col items-center text-center">
          <Seal size={340} />
          <h2 className="mt-10 max-w-md font-arabic-heading text-4xl font-bold leading-snug">
            مساحة مكتبك
            <span className="block text-gold">بانتظارك.</span>
          </h2>
          <p className="mt-4 max-w-sm leading-7 text-[color:var(--lux-muted)]">
            كل مكتب في مساحته المعزولة، وكل عميل يدخل من رابط مكتبه الخاص فقط.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-[color:var(--lux-muted)]">
          <LockKeyhole size={14} className="text-[color:var(--lux-gold)]" /> اتصال آمن · جلسة تنتهي تلقائيًا بعد 8 ساعات
        </p>
      </section>

      {/* form side */}
      <section className="flex items-center justify-center px-4 py-14 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 block text-center font-arabic-heading text-3xl font-bold text-gold lg:hidden">Mohamik</Link>
          <div className="lux-frame lux-glass rounded-[1.75rem] p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:p-9">
            <div className="gold-rule" />
            <h1 className="mt-5 font-arabic-heading text-3xl font-bold">تسجيل الدخول</h1>
            <p className="mt-2 text-sm text-[color:var(--lux-muted)]">
              {firmFromLink ? "بوابة العميل أو غرفة إدارة المكتب." : "غرفة إدارة المكتب أو بوابة العملاء."}
            </p>

            {firmFromLink && (
              <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--lux-gold)]/25 bg-[color:var(--lux-gold)]/[0.07] px-4 py-3">
                <span className="flex items-center gap-2 text-sm">
                  <BadgeCheck size={17} className="text-[color:var(--lux-gold)]" />
                  الدخول إلى مكتب
                </span>
                <span dir="ltr" className="tnum text-sm font-semibold text-[color:var(--lux-gold-soft)]">{firmFromLink}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              {!firmFromLink && (
                <div>
                  <label htmlFor="subdomain" className="mb-2 block text-sm font-semibold">
                    نطاق المكتب <span className="font-normal text-[color:var(--lux-muted)]">(اتركه فارغًا لإدارة المنصة)</span>
                  </label>
                  <input
                    id="subdomain"
                    className={field}
                    autoComplete="organization"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="demo-firm"
                    dir="ltr"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">البريد الإلكتروني</label>
                <input
                  id="email"
                  type="email"
                  required
                  dir="ltr"
                  className={field}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold">كلمة المرور</label>
                <input
                  id="password"
                  type="password"
                  required
                  dir="ltr"
                  className={field}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="bg-gold group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 font-bold disabled:opacity-60">
                {loading ? "جارٍ الدخول..." : "دخول"}
                {!loading && <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />}
              </button>
            </form>

            {firmFromLink ? (
              <p className="mt-6 text-center text-sm text-[color:var(--lux-muted)]">
                عميل جديد؟{" "}
                <Link href={`/f/${encodeURIComponent(firmFromLink)}/portal/register`} className="font-semibold text-[color:var(--lux-gold-soft)] hover:underline">
                  أنشئ حسابك في هذا المكتب
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-center text-sm text-[color:var(--lux-muted)]">
                ليس لديك حساب؟{" "}
                <Link href="/register-firm" className="font-semibold text-[color:var(--lux-gold-soft)] hover:underline">سجّل مكتبك</Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
