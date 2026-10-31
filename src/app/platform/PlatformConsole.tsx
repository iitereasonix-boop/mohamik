"use client";

import { useState } from "react";

type Application = {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  barNumber: string;
  commercialReg: string | null;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
};

type ManagedFirm = {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

type Stats = { pending: number; active: number; total: number; rejected: number };
type NewFirm = {
  name: string;
  subdomain: string;
  barNumber: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  phone: string;
};

const EMPTY_FIRM: NewFirm = {
  name: "",
  subdomain: "",
  barNumber: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  phone: "",
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium" }).format(new Date(date));

export default function PlatformConsole({
  adminName,
  initialRequests,
  initialFirms,
  stats: initialStats,
}: {
  adminName: string;
  initialRequests: Application[];
  initialFirms: ManagedFirm[];
  stats: Stats;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [firms, setFirms] = useState(initialFirms);
  const [stats, setStats] = useState(initialStats);
  const [form, setForm] = useState(EMPTY_FIRM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reviewRequest(tenantId: string, action: "approve" | "reject") {
    setBusyId(tenantId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, action }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّرت معالجة الطلب.");
        return;
      }

      setRequests((current) => current.filter((request) => request.id !== tenantId));
      if (action === "approve") {
        setFirms((current) => [{
          id: tenantId,
          name: result.name,
          subdomain: result.subdomain,
          email: result.email,
          phone: result.phone,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        }, ...current]);
      }
      setStats((current) => ({
        ...current,
        pending: Math.max(0, current.pending - 1),
        active: action === "approve" ? current.active + 1 : current.active,
        rejected: action === "reject" ? current.rejected + 1 : current.rejected,
      }));
      setNotice(action === "approve" ? "تم قبول وتفعيل المكتب." : "تم رفض طلب المكتب.");
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeFirmStatus(firm: ManagedFirm) {
    const action = firm.status === "ACTIVE" ? "suspend" : "reactivate";
    setBusyId(firm.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: firm.id, action }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر تحديث حالة المكتب.");
        return;
      }

      setFirms((current) =>
        current.map((item) =>
          item.id === firm.id
            ? { ...item, status: action === "suspend" ? "SUSPENDED" : "ACTIVE" }
            : item
        )
      );
      setStats((current) => ({
        ...current,
        active: current.active + (action === "suspend" ? -1 : 1),
      }));
      setNotice(action === "suspend" ? "تم إيقاف المكتب." : "تمت إعادة تفعيل المكتب.");
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusyId(null);
    }
  }

  async function createFirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر إنشاء حساب المكتب.");
        return;
      }

      setFirms((current) => [{
        id: result.id,
        name: result.name,
        subdomain: result.subdomain,
        email: result.email,
        phone: result.phone,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      }, ...current]);
      setStats((current) => ({ ...current, total: current.total + 1, active: current.active + 1 }));
      setForm(EMPTY_FIRM);
      setNotice(`تم إنشاء المكتب. رابط موقعه: /f/${result.subdomain}`);
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-8 text-ink sm:px-8" dir="rtl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة منصة Mohamik</h1>
          <p className="mt-1 text-sm text-warmgray-500">مرحبًا {adminName} — غرفة التحكم وإدارة المكاتب.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/platform/laws" className="btn-secondary">مكتبة القوانين</a>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn-secondary">تسجيل الخروج</button>
          </form>
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="text-sm text-warmgray-500">كل المكاتب</p><p className="mt-2 text-2xl font-bold tnum">{stats.total}</p></div>
        <div className="card"><p className="text-sm text-warmgray-500">المفعّلة</p><p className="mt-2 text-2xl font-bold tnum">{stats.active}</p></div>
        <div className="card"><p className="text-sm text-warmgray-500">بانتظار الموافقة</p><p className="mt-2 text-2xl font-bold tnum">{stats.pending}</p></div>
        <div className="card"><p className="text-sm text-warmgray-500">المرفوضة</p><p className="mt-2 text-2xl font-bold tnum">{stats.rejected}</p></div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="card" id="applications">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">طلبات انضمام المكاتب</h2>
            <span className="badge bg-paper-100 text-ink">{requests.length} طلب</span>
          </div>
          {requests.length === 0 ? (
            <p className="mt-5 text-sm text-warmgray-500">لا توجد طلبات بانتظار المراجعة.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold">{request.name}</h3>
                      <p className="mt-1 text-sm text-warmgray-500" dir="ltr">
                        {request.subdomain}.mohamik.com
                      </p>
                    </div>
                    <span className="text-xs text-warmgray-400">{formatDate(request.createdAt)}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Detail label="الشريك المدير" value={request.ownerName} />
                    <Detail label="البريد" value={request.ownerEmail} />
                    <Detail label="رقم النقابة" value={request.barNumber} />
                    <Detail label="الهاتف" value={request.phone || "—"} />
                    <Detail label="العنوان" value={request.address || "—"} />
                    <Detail label="السجل التجاري" value={request.commercialReg || "—"} />
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => reviewRequest(request.id, "approve")}
                      className="btn-primary disabled:opacity-50"
                    >
                      {busyId === request.id ? "جارٍ التحديث..." : "قبول وتفعيل المكتب"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => reviewRequest(request.id, "reject")}
                      className="btn-secondary text-red-700 disabled:opacity-50"
                    >
                      رفض الطلب
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">إنشاء حساب مكتب</h2>
          <p className="mt-1 text-sm text-warmgray-500">إنشاء مساحة مكتب مفعّلة وحساب للشريك المدير.</p>
          <form onSubmit={createFirm} className="mt-4 space-y-3">
            <Field label="اسم المكتب" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
            <Field label="الرابط الفرعي" value={form.subdomain} onChange={(subdomain) => setForm({ ...form, subdomain: subdomain.toLowerCase() })} required minLength={3} pattern="[a-z0-9-]+" dir="ltr" />
            <Field label="رقم عضوية النقابة" value={form.barNumber} onChange={(barNumber) => setForm({ ...form, barNumber })} required />
            <Field label="اسم الشريك المدير" value={form.ownerName} onChange={(ownerName) => setForm({ ...form, ownerName })} required />
            <Field label="البريد الإلكتروني" type="email" value={form.ownerEmail} onChange={(ownerEmail) => setForm({ ...form, ownerEmail })} required dir="ltr" />
            <Field label="كلمة المرور الأولية" type="password" value={form.ownerPassword} onChange={(ownerPassword) => setForm({ ...form, ownerPassword })} required minLength={10} />
            <Field label="الهاتف (اختياري)" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} dir="ltr" />
            <button type="submit" disabled={creating} className="btn-primary w-full disabled:opacity-50">
              {creating ? "جارٍ الإنشاء..." : "إنشاء وتفعيل المكتب"}
            </button>
          </form>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="text-lg font-bold">المكاتب المسجلة</h2>
        {firms.length === 0 ? (
          <p className="mt-4 text-sm text-warmgray-500">لا توجد مكاتب مفعّلة بعد.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {firms.map((firm) => (
              <article key={firm.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-200 pt-3">
                <div>
                  <p className="font-semibold">{firm.name}</p>
                  <p className="mt-1 text-sm text-warmgray-500" dir="ltr">
                    {firm.subdomain}.mohamik.com · {firm.email ?? ""}
                  </p>
                  <a className="mt-1 inline-block text-xs underline" href={`/f/${firm.subdomain}`} target="_blank" rel="noreferrer">
                    فتح موقع المكتب
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge bg-paper-100 text-ink">
                    {firm.status === "ACTIVE" ? "مفعّل" : "موقوف"}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === firm.id}
                    onClick={() => changeFirmStatus(firm)}
                    className="btn-secondary disabled:opacity-50"
                  >
                    {firm.status === "ACTIVE" ? "إيقاف المكتب" : "إعادة التفعيل"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  minLength,
  pattern,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  pattern?: string;
  dir?: "ltr";
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <input
        className="input"
        type={type}
        required={required}
        minLength={minLength}
        maxLength={type === "password" ? 72 : undefined}
        pattern={pattern}
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-warmgray-400">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>;
}
