import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "./ui";

// Two-column layout for the portal's form pages: the form card plus a short
// "what happens next" aside.
export default function FormPage({
  eyebrow,
  title,
  text,
  steps,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  steps: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <PageHeader eyebrow={eyebrow} title={title} text={text} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="portal-form rounded-[1.75rem] border border-[#0f1c36]/[0.07] bg-white p-6 shadow-[0_10px_30px_-20px_rgba(15,28,54,0.25)] sm:p-8">
          {children}
        </div>
        <aside className="relative overflow-hidden rounded-[1.75rem] bg-[#0f1c36] p-7 text-white">
          <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.06]" />
          <p className="relative font-arabic-heading text-xl font-bold text-[#f1dfb3]">ماذا يحدث بعد ذلك؟</p>
          <ol className="relative mt-5 space-y-4">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm leading-7 text-white/75">
                <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af6a]/40 text-xs text-[#f1dfb3]">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="relative mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-white/55">
            <CheckCircle2 size={15} className="text-[#d4af6a]" /> بياناتك تصل لهذا المكتب فقط.
          </p>
        </aside>
      </div>
    </div>
  );
}
