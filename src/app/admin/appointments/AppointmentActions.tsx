"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS: Record<string, { status: string; label: string; tone: string }[]> = {
  SCHEDULED: [
    { status: "CONFIRMED", label: "موافقة", tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
    { status: "CANCELLED", label: "رفض", tone: "border border-red-200 text-red-700 hover:bg-red-50" },
  ],
  CONFIRMED: [
    { status: "COMPLETED", label: "تمّ الموعد", tone: "bg-[#0f1c36] text-white hover:bg-[#13234a]" },
    { status: "NO_SHOW", label: "لم يحضر", tone: "border border-slate-200 text-slate-600 hover:bg-slate-50" },
    { status: "CANCELLED", label: "إلغاء", tone: "border border-red-200 text-red-700 hover:bg-red-50" },
  ],
};

export default function AppointmentActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = ACTIONS[status] ?? [];
  if (actions.length === 0) return null;

  async function act(next: string) {
    setBusy(next);
    setError(null);
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "تعذّر تحديث الموعد.");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={busy !== null}
            onClick={() => act(a.status)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${a.tone}`}
          >
            {busy === a.status ? "..." : a.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
