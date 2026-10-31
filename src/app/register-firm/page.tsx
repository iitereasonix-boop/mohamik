"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check } from "lucide-react";
import Seal from "@/components/landing/Seal";

const AREA_AR: Record<string, string> = {
  CRIMINAL: "جزائية", CIVIL: "مدنية", COMMERCIAL: "تجارية", LABOUR: "عمالية",
  FAMILY: "أحوال شخصية", REAL_ESTATE: "عقارات وإيجارات", COMPANIES: "شركات",
  CYBERCRIME: "جرائم إلكترونية", ENFORCEMENT: "تنفيذ", OTHER: "أخرى",
};

const PLAN_LABELS: Record<string, string> = {
  SOLO: "منفرد (محامٍ واحد)",
  FIRM: "مكتب (حتى 10 محامين)",
  ENTERPRISE: "مؤسسي (فروع متعددة، دومين خاص)",
};

export default function RegisterFirmPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    barNumber: "",
    commercialReg: "",
    address: "",
    phone: "",
    email: "",
    ownerEmail: "",
    ownerPassword: "",
    plan: "FIRM",
    practiceAreas: [] as string[],
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleArea(area: string) {
    setForm((f) => ({
      ...f,
      practiceAreas: f.practiceAreas.includes(area)
        ? f.practiceAreas.filter((a) => a !== area)
        : [...f.practiceAreas, area],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tenants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "تعذّر إنشاء الحساب. تحقق من البيانات.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="lux lux-grain relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 font-arabic-body">
        <div aria-hidden className="lux-aurora absolute -top-40 right-[-10%] -z-10 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.22),transparent_62%)] blur-2xl" />
        <div className="lux-frame lux-glass max-w-md rounded-[1.75rem] p-9 text-center">
          <div className="mx-auto w-40"><Seal size={160} /></div>
          <h1 className="mt-6 font-arabic-heading text-3xl font-bold">تم إرسال <span className="text-gold">طلب التسجيل</span></h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--lux-muted)]">
            سيتم التحقق من عضوية نقابة المحامين ورقم الترخيص من قبل فريق Mohamik قبل تفعيل المكتب.
            ستصلك رسالة على البريد عند التفعيل مع رابط بوابة عملائك:
            <br />
            <code dir="ltr" className="tnum mt-4 block rounded-xl border border-[color:var(--lux-gold)]/25 bg-[color:var(--lux-gold)]/[0.07] p-3 text-sm text-[color:var(--lux-gold-soft)]">
              {form.subdomain || "firmname"}.mohamik.com
            </code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="lux lux-grain relative isolate min-h-screen overflow-hidden font-arabic-body">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="lux-aurora absolute -top-40 right-[-10%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,0.22),transparent_62%)] blur-2xl" />
        <div className="lux-lattice absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link href="/" className="font-arabic-heading text-2xl font-bold text-gold">Mohamik</Link>
      <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-[color:var(--lux-gold)]/25 px-4 py-1.5 text-xs text-[color:var(--lux-gold-soft)]">
        <BadgeCheck size={14} /> كل مكتب يمر بتحقق يدوي من عضوية النقابة
      </p>
      <h1 className="mt-5 font-arabic-heading text-4xl font-bold leading-tight sm:text-5xl">سجّل مكتبك في <span className="text-gold">Mohamik</span></h1>
      <p className="mt-3 leading-7 text-[color:var(--lux-muted)]">
        مساحة عمل معزولة لمكتبك، موقع بهويتك، ورابط بوابة خاص يحصل منه كل عميل على حسابه في مكتبك.
      </p>

      <ol className="mt-8 grid grid-cols-3 gap-2 text-xs sm:text-sm">
        {["بيانات المكتب", "بيانات الشريك", "الباقة ومجالات العمل"].map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${step === i + 1
              ? "border-[color:var(--lux-gold)]/50 bg-[color:var(--lux-gold)]/10 text-[color:var(--lux-gold-soft)]"
              : step > i + 1 ? "border-white/10 text-[color:var(--lux-ivory)]" : "border-white/[0.06] text-[color:var(--lux-muted)]"
              }`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${step >= i + 1 ? "bg-gold" : "bg-white/10"}`}>
              {step > i + 1 ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="lux-frame lux-glass mt-6 space-y-5 rounded-[1.75rem] p-6 sm:p-9 [&_input]:border-white/10 [&_input]:bg-white/[0.04] [&_input]:py-3 [&_input]:text-[color:var(--lux-ivory)] [&_label]:mb-2 [&_select]:border-white/10 [&_select]:bg-[#0f1c36] [&_select]:py-3 [&_select]:text-[color:var(--lux-ivory)] [&_.input]:rounded-xl">
        {step === 1 && (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold">اسم المكتب</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">
                النطاق الفرعي (subdomain)
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="input"
                  required
                  pattern="[a-z0-9-]{3,30}"
                  value={form.subdomain}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })}
                  placeholder="firmname"
                />
                <span dir="ltr" className="tnum text-sm text-[color:var(--lux-muted)]">.mohamik.com</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">رقم عضوية نقابة المحامين (الشريك المدير)</label>
              <input
                className="input tnum"
                required
                value={form.barNumber}
                onChange={(e) => setForm({ ...form, barNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">رقم السجل التجاري (اختياري – للشركات)</label>
              <input
                className="input tnum"
                value={form.commercialReg}
                onChange={(e) => setForm({ ...form, commercialReg: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">العنوان</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="bg-gold rounded-xl px-6 py-3 font-bold disabled:opacity-60"
              onClick={() => setStep(2)}
            >
              التالي
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold">بريد الشريك المدير</label>
              <input
                type="email"
                className="input"
                required
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">كلمة المرور</label>
              <input
                type="password"
                className="input"
                required
                minLength={10}
                value={form.ownerPassword}
                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">هاتف المكتب</label>
              <input
                className="input tnum"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+962 7 ..."
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-xl border border-white/10 px-6 py-3 font-semibold transition hover:bg-white/[0.05]" onClick={() => setStep(1)}>
                السابق
              </button>
              <button type="button" className="bg-gold rounded-xl px-6 py-3 font-bold disabled:opacity-60" onClick={() => setStep(3)}>
                التالي
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold">الباقة</label>
              <select
                className="input"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              >
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">مجالات العمل</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(AREA_AR).map((area) => (
                  <button
                    type="button"
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${form.practiceAreas.includes(area)
                        ? "bg-gold border-transparent font-semibold"
                        : "border-white/10 text-[color:var(--lux-muted)] hover:border-[color:var(--lux-gold)]/40"
                      }`}
                  >
                    {AREA_AR[area] ?? area}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-xl border border-white/10 px-6 py-3 font-semibold transition hover:bg-white/[0.05]" onClick={() => setStep(2)}>
                السابق
              </button>
              <button type="submit" disabled={loading} className="bg-gold rounded-xl px-6 py-3 font-bold disabled:opacity-60">
                {loading ? "جارٍ الإرسال..." : "إرسال طلب التسجيل"}
              </button>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </form>
      </div>
    </main>
  );
}
