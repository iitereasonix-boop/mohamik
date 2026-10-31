import { withTenant } from "@/lib/tenant";
import { requirePermission } from "@/lib/session";
import { guardSection } from "@/lib/admin-access";
import { ROLE_LABELS_AR } from "@/lib/permissions";
import { AddMemberForm, ToggleActive } from "./TeamManager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const ctx = await guardSection("team");
  await requirePermission("settings.manage");

  const tenantId = ctx!.tenantId!;
  const team = await withTenant(tenantId, (tx) => tx.user.findMany({
    where: { tenantId, kind: "TENANT" },
    select: { id: true, name: true, email: true, tenantRole: true, active: true, lastLoginAt: true },
    orderBy: { createdAt: "asc" },
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">فريق المكتب</h1>
      <AddMemberForm />
      {team.length === 0 ? (
        <p className="mt-4 text-sm text-warmgray-500">لا يوجد أعضاء.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-paper-100 text-xs text-warmgray-500">
              <tr>
                <th className="px-4 py-2 text-right">الاسم</th>
                <th className="px-4 py-2 text-right">البريد</th>
                <th className="px-4 py-2 text-right">الدور</th>
                <th className="px-4 py-2 text-right">الحالة</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id} className="border-t border-paper-200">
                  <td className="px-4 py-2 font-semibold">{u.name}</td>
                  <td className="px-4 py-2" dir="ltr">{u.email}</td>
                  <td className="px-4 py-2">{u.tenantRole ? ROLE_LABELS_AR[u.tenantRole] : "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${u.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {u.active ? "مفعّل" : "معطّل"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.tenantRole !== "MANAGING_PARTNER" && u.id !== ctx!.userId && <ToggleActive id={u.id} active={u.active} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
