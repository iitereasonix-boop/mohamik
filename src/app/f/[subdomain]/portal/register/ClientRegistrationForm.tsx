"use client";

import Link from "next/link";
import { useState } from "react";

export default function ClientRegistrationForm({
  subdomain,
}: {
  subdomain: string;
}) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    privacyAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/f/${subdomain}/clients/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر إنشاء الحساب.");
        return;
      }
      setDone(true);
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقق من اتصالك ثم حاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <div className="gold-rule mb-4" />
        <h2 className="text-xl font-bold">تم إنشاء حسابك</h2>
        <p className="mt-2 text-sm text-warmgray-500">
          يمكنك الآن تسجيل الدخول إلى بوابة {subdomain} ومتابعة بياناتك الخاصة.
        </p>
        <Link
          href={`/login?subdomain=${encodeURIComponent(subdomain)}`}
          className="btn-primary mt-5 inline-block"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label htmlFor="client-name" className="mb-1 block text-sm font-semibold">
          الاسم الكامل
        </label>
        <input
          id="client-name"
          className="input"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div>
        <label htmlFor="client-mobile" className="mb-1 block text-sm font-semibold">
          رقم الجوال
        </label>
        <input
          id="client-mobile"
          className="input tnum"
          autoComplete="tel"
          required
          minLength={7}
          maxLength={20}
          value={form.mobile}
          onChange={(event) => setForm({ ...form, mobile: event.target.value })}
          dir="ltr"
        />
      </div>
      <div>
        <label htmlFor="client-email" className="mb-1 block text-sm font-semibold">
          البريد الإلكتروني
        </label>
        <input
          id="client-email"
          type="email"
          className="input"
          autoComplete="email"
          required
          maxLength={254}
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          dir="ltr"
        />
      </div>
      <div>
        <label htmlFor="client-password" className="mb-1 block text-sm font-semibold">
          كلمة المرور
        </label>
        <input
          id="client-password"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <p className="mt-1 text-xs text-warmgray-400">10 أحرف على الأقل.</p>
      </div>
      <label className="flex items-start gap-2 text-sm leading-6 text-warmgray-500">
        <input
          type="checkbox"
          required
          checked={form.privacyAccepted}
          onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })}
          className="mt-1"
        />
        <span>
          أوافق على إنشاء حساب لدى هذا المكتب واستخدام بياناتي لتقديم الخدمات القانونية ومتابعة
          طلباتي.
        </span>
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
      </button>
      <p className="text-center text-sm text-warmgray-500">
        لديك حساب؟{" "}
        <Link
          href={`/login?subdomain=${encodeURIComponent(subdomain)}`}
          className="font-semibold underline"
        >
          سجّل الدخول
        </Link>
      </p>
    </form>
  );
}
