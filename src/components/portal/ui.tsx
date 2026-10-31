import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function PageHeader({ eyebrow, title, text, children }: { eyebrow?: string; title: React.ReactNode; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="flex items-center gap-2 text-sm font-semibold text-[#9a7436]">
            <span className="h-px w-6 bg-[#b08d57]" /> {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-arabic-heading text-3xl font-bold sm:text-4xl">{title}</h1>
        {text && <p className="mt-2 max-w-2xl leading-7 text-[#0f1c36]/60">{text}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, icon, action, children, className = "" }: { title?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-[#0f1c36]/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,28,54,0.04),0_10px_30px_-20px_rgba(15,28,54,0.25)] sm:p-7 ${className}`}>
      {title && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-lg font-bold">
            {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#9a7436]">{icon}</span>}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#0f1c36]/12 bg-[#fbf9f4] px-4 py-8 text-center">
      <span className="text-[#b08d57]">{icon}</span>
      <p className="mt-3 text-sm text-[#0f1c36]/55">{text}</p>
    </div>
  );
}

export function LoginRequired({ subdomain, what }: { subdomain: string; what: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-3xl border border-[#0f1c36]/[0.07] bg-white p-9 text-center shadow-[0_20px_60px_-30px_rgba(15,28,54,0.35)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f1c36] text-[#f1dfb3]">
          <LockKeyhole size={28} strokeWidth={1.6} />
        </span>
        <h1 className="mt-6 font-arabic-heading text-2xl font-bold">سجّل الدخول لعرض {what}</h1>
        <p className="mt-3 text-sm leading-7 text-[#0f1c36]/60">
          هذه الصفحة خاصة بعملاء المكتب. ادخل بحسابك، أو أنشئ حسابًا جديدًا من بوابة المكتب.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Link href={`/login?subdomain=${encodeURIComponent(subdomain)}`} className="bg-gold rounded-xl px-5 py-3.5 font-bold">
            تسجيل الدخول
          </Link>
          <Link href={`/f/${subdomain}/portal/register`} className="rounded-xl border border-[#0f1c36]/12 px-5 py-3.5 font-semibold transition hover:border-[#b08d57]">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}>{children}</span>;
}
