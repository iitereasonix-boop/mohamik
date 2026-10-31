"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Lock, Power } from "lucide-react";

type Model = { id: string; label: string; hint: string };
type Provider = { id: "anthropic" | "openai-compatible"; label: string };
type Current = { last4: string; provider: Provider["id"]; baseUrl: string | null; model: string; enabled: boolean; verifiedAt: string | null } | null;

export default function SettingsForm({ current, models, providers }: { current: Current; models: readonly Model[]; providers: readonly Provider[] }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [provider, setProvider] = useState<Provider["id"]>(current?.provider ?? "anthropic");
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? "");
  const [model, setModel] = useState(current?.model ?? models[0].id);
  const [enabled, setEnabled] = useState(current?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/hukm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined, provider, baseUrl: provider === "openai-compatible" ? baseUrl.trim() : undefined, model: model.trim(), enabled }),
      });
      const result = await r.json().catch(() => null);
      if (!r.ok) return setError(result?.error ?? "تعذّر الحفظ.");
      setApiKey("");
      setSaved(true);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("حذف مفتاح API؟ سيتوقف «حُكم» عن العمل لكل الفريق حتى تضيف مفتاحًا جديدًا.")) return;
    const r = await fetch("/api/hukm/settings", { method: "DELETE" }).catch(() => null);
    if (r?.ok) router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={save} className="space-y-6 rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f1c36]">مفتاح الذكاء الاصطناعي للمكتب</h2>
          {current ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${current.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              <CheckCircle2 size={13} /> {current.enabled ? "مفعّل" : "متوقف مؤقتًا"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">غير مُعدّ</span>
          )}
        </div>

        {current && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#fbf9f4] px-4 py-3 text-sm">
            <KeyRound size={17} className="text-[#b08d57]" />
            <span>المفتاح الحالي ينتهي بـ <b dir="ltr" className="tnum">…{current.last4}</b></span>
            {current.verifiedAt && <span className="text-xs text-[#0f1c36]/45">· تحقّق {new Date(current.verifiedAt).toLocaleDateString("ar-JO")}</span>}
          </div>
        )}

        <div>
          <label htmlFor="provider" className="mb-1.5 block text-sm font-semibold">مزود الذكاء الاصطناعي</label>
          <select id="provider" value={provider} onChange={(e) => {
            const nextProvider = e.target.value as Provider["id"];
            setProvider(nextProvider);
            setModel(nextProvider === "anthropic" ? models[0].id : "gpt-4o-mini");
          }} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none focus:border-[#b08d57]">
            {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>

        {provider === "openai-compatible" && (
          <div>
            <label htmlFor="base-url" className="mb-1.5 block text-sm font-semibold">عنوان API الأساسي</label>
            <input id="base-url" type="url" required dir="ltr" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#b08d57]" />
            <p className="mt-1 text-xs text-[#0f1c36]/50">استخدم عنوان HTTPS الذي يقدمه مزودك؛ تُقبل واجهات OpenAI-compatible.</p>
          </div>
        )}

        <div>
          <label htmlFor="api-key" className="mb-1.5 block text-sm font-semibold">{current ? "استبدال المفتاح (اتركه فارغًا للإبقاء على الحالي)" : "مفتاح API"}</label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 focus-within:border-[#b08d57] focus-within:ring-1 focus-within:ring-[#b08d57]">
            <Lock size={16} className="text-[#0f1c36]/35" />
            <input
              id="api-key"
              type={reveal ? "text" : "password"}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              required={!current}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "anthropic" ? "sk-ant-api03-…" : "مفتاح API الخاص بمزودك"}
              className="w-full bg-transparent py-3 font-mono text-sm outline-none"
            />
            <button type="button" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "إخفاء" : "إظهار"} className="text-[#0f1c36]/40 hover:text-[#0f1c36]">
              {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[#0f1c36]/50">يُفحص المفتاح والنموذج قبل الحفظ، ثم يُحفظ مشفّرًا ولا يظهر بعد ذلك لأي أحد.</p>
        </div>

        <div>
          <label htmlFor="model" className="mb-2 block text-sm font-semibold">معرّف النموذج لدى المزود</label>
          <input id="model" required value={model} onChange={(e) => setModel(e.target.value)} dir="ltr" maxLength={120}
            list={provider === "anthropic" ? "anthropic-models" : undefined}
            placeholder={provider === "anthropic" ? models[0].id : "gpt-4o-mini"}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#b08d57]" />
          {provider === "anthropic" && (
            <datalist id="anthropic-models">{models.map((item) => <option key={item.id} value={item.id}>{item.hint}</option>)}</datalist>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#0f1c36]/[0.08] px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Power size={16} className="text-[#b08d57]" /> تشغيل «حُكم» لفريق المكتب</span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-[#0f1c36]" />
        </label>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {saved && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">تم التحقق من المفتاح وحفظ الإعدادات. «حُكم» جاهز للعمل.</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy && <Loader2 size={15} className="animate-spin" />} {busy ? "جارٍ التحقق من المفتاح…" : "تحقّق واحفظ"}
          </button>
          {current && <button type="button" onClick={remove} className="rounded-md px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">حذف المفتاح</button>}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl bg-[#0f1c36] p-6 text-white">
          <div aria-hidden className="lux-lattice pointer-events-none absolute inset-0 opacity-[0.06]" />
          <p className="relative font-arabic-heading text-xl font-bold text-[#f1dfb3]">كيف أحصل على مفتاح؟</p>
          <ol className="relative mt-4 space-y-3 text-sm leading-7 text-white/75">
            <li>1. اختر مزودًا يوفر API متوافقًا مع OpenAI، أو اختر Anthropic لواجهات Claude الأصلية.</li>
            <li>2. أدخل مفتاح المزود، ومعرّف النموذج؛ وللواجهات المتوافقة أدخل عنوان API الأساسي.</li>
            <li>3. اضغط «تحقّق واحفظ». يدعم ذلك OpenAI وOpenRouter وGroq وDeepSeek ومزودين آخرين متوافقين.</li>
          </ol>
          {provider === "anthropic" && (
            <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer" className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#f1dfb3] hover:underline">
              فتح صفحة مفاتيح Anthropic <ExternalLink size={14} />
            </a>
          )}
        </div>
        <div className="rounded-3xl border border-[#0f1c36]/[0.08] bg-white p-6 text-sm leading-7 text-[#0f1c36]/65">
          <p className="font-bold text-[#0f1c36]">لمن يعمل «حُكم»؟</p>
          <p className="mt-2">للشريك الإداري والمحامين والمتدربين. لا يظهر للسكرتارية ولا للعملاء. كل مستخدم يرى محادثاته فقط، وتُسجَّل كل الاستخدامات في سجل المكتب.</p>
          <p className="mt-3 font-bold text-[#0f1c36]">التكلفة</p>
          <p className="mt-2">يُحتسب الاستخدام على حساب مكتبك لدى مزود الذكاء الاصطناعي الذي تختاره.</p>
        </div>
      </aside>
    </div>
  );
}
