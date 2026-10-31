"use client";

import { useState } from "react";
import ImageField from "./ImageField";

type WebsiteSettings = {
  name: string;
  subdomain: string;
  logoUrl: string;
  accentColor: string;
  siteCoverImageUrl: string;
  portalBackgroundUrl: string;
  siteTagline: string;
  siteAbout: string;
};

export default function WebsiteEditor({
  initial,
  publicBaseUrl,
}: {
  initial: WebsiteSettings;
  publicBaseUrl: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicSitePath = `/f/${form.subdomain}`;
  const clientPortalPath = `${publicSitePath}/portal/register`;

  async function copyClientLink() {
    try {
      await navigator.clipboard.writeText(`${publicBaseUrl}${clientPortalPath}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("تعذّر نسخ الرابط تلقائيًا. انسخه يدويًا من الحقل.");
    }
  }

  function update<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/admin/website", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر حفظ إعدادات الموقع.");
        return;
      }
      setSaved(true);
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقق من اتصالك ثم حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold">الموقع العام للمكتب</p>
          <p className="mt-1 text-xs text-warmgray-500">شارك نبذة المكتب ومجالات عمله.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs" dir="ltr">
              {publicBaseUrl}{publicSitePath}
            </code>
            <a href={publicSitePath} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
              معاينة
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm font-bold">رابط تسجيل العملاء</p>
          <p className="mt-1 text-xs text-warmgray-500">أرسله للعميل لينشئ حسابه الخاص ويرتبط بمكتبك.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs" dir="ltr">
              {publicBaseUrl}{clientPortalPath}
            </code>
            <button type="button" onClick={copyClientLink} className="btn-primary whitespace-nowrap">
              {copied ? "تم النسخ ✓" : "نسخ الرابط"}
            </button>
          </div>
          <a href={clientPortalPath} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold underline">
            فتح صفحة تسجيل العميل
          </a>
        </div>
      </div>

      <form onSubmit={submit} className="card mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firm-name" className="mb-1 block text-sm font-semibold">
              اسم المكتب
            </label>
            <input
              id="firm-name"
              className="input"
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="accent-color" className="mb-1 block text-sm font-semibold">
              اللون الرئيسي
            </label>
            <div className="flex items-center gap-3">
              <input
                id="accent-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1"
                value={form.accentColor}
                onChange={(event) => update("accentColor", event.target.value)}
              />
              <span className="text-sm text-warmgray-500 tnum" dir="ltr">
                {form.accentColor}
              </span>
            </div>
          </div>
          <ImageField
            kind="LOGO"
            label="شعار المكتب"
            hint="PNG أو JPG أو WEBP حتى 2 ميغابايت. يظهر في موقع المكتب وبوابة العملاء ودليل المكاتب."
            value={form.logoUrl}
            onChange={(url) => update("logoUrl", url)}
          />
          <ImageField
            kind="COVER"
            label="صورة الواجهة"
            hint="صورة عرضية للمكتب حتى 5 ميغابايت. تظهر في أعلى الصفحة الرئيسية لموقع المكتب."
            value={form.siteCoverImageUrl}
            onChange={(url) => update("siteCoverImageUrl", url)}
          />
          <ImageField
            kind="BACKGROUND"
            label="خلفية بوابة العملاء"
            hint="صورة عرضية حتى 5 ميغابايت تظهر خلف رأس صفحات العميل (الرئيسية، قضاياي، الحجز، الاستشارة)، مع طبقة داكنة تحافظ على وضوح النص."
            value={form.portalBackgroundUrl}
            onChange={(url) => update("portalBackgroundUrl", url)}
          />
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className="mb-1 block text-sm font-semibold">
              عبارة تعريفية قصيرة
            </label>
            <input
              id="tagline"
              className="input"
              maxLength={180}
              placeholder="خبرة قانونية تثق بها"
              value={form.siteTagline}
              onChange={(event) => update("siteTagline", event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="about" className="mb-1 block text-sm font-semibold">
              نبذة عن المكتب
            </label>
            <textarea
              id="about"
              className="input"
              rows={4}
              maxLength={2000}
              value={form.siteAbout}
              onChange={(event) => update("siteAbout", event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            تم حفظ إعدادات الموقع.
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "جارٍ الحفظ..." : "حفظ ونشر التعديلات"}
        </button>
      </form>
    </>
  );
}
