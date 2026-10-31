import { TenantRole, PlatformRole } from "@prisma/client";

export type { TenantRole };

// ───────── Server-enforced permissions (never trust the client) ─────────

export const ROLE_LABELS_AR: Record<TenantRole, string> = {
  MANAGING_PARTNER: "شريك إداري",
  LAWYER: "محامٍ",
  TRAINEE: "محامٍ متدرب",
  SECRETARY: "سكرتير/سكرتيرة",
  ACCOUNTANT: "محاسب",
};

export const ROLE_LABELS_EN: Record<TenantRole, string> = {
  MANAGING_PARTNER: "Managing Partner",
  LAWYER: "Lawyer",
  TRAINEE: "Trainee Lawyer",
  SECRETARY: "Secretary",
  ACCOUNTANT: "Accountant",
};

export type Permission =
  | "case.view"
  | "case.edit"
  | "case.close"
  | "case.assign"
  | "client.view"
  | "client.edit"
  | "note.confidential.view" // internal notes – never secretaries
  | "ai.use" // AI legal analysis – never secretaries
  | "ai.read_only"
  | "billing.view"
  | "billing.edit"
  | "appointment.manage"
  | "document.view"
  | "document.edit"
  | "settings.manage"
  | "knowledge.approve"
  | "audit.view";

const MATRIX: Record<TenantRole, Permission[]> = {
  MANAGING_PARTNER: [
    "case.view", "case.edit", "case.close", "case.assign",
    "client.view", "client.edit",
    "note.confidential.view", "ai.use",
    "billing.view", "billing.edit",
    "appointment.manage",
    "document.view", "document.edit",
    "settings.manage", "knowledge.approve", "audit.view",
  ],
  LAWYER: [
    "case.view", "case.edit", "case.close", "case.assign",
    "client.view", "client.edit",
    "note.confidential.view", "ai.use",
    "billing.view",
    "appointment.manage",
    "document.view", "document.edit",
    "knowledge.approve",
  ],
  TRAINEE: [
    "case.view", "case.edit",
    "client.view",
    "note.confidential.view", "ai.read_only",
    "appointment.manage",
    "document.view", "document.edit",
  ],
  SECRETARY: [
    "case.view",
    "client.view", "client.edit",
    "billing.view",
    "appointment.manage",
    "document.view", "document.edit",
  ],
  ACCOUNTANT: ["billing.view", "billing.edit"],
};

export function can(role: TenantRole, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function canUseAI(role: TenantRole): boolean {
  return role === "MANAGING_PARTNER" || role === "LAWYER";
}

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  SUPER_ADMIN: "مدير منصة",
  LEGAL_EDITOR: "محرر محتوى قانوني",
  SUPPORT: "دعم فني",
  FINANCE: "مالية",
};

export function isPlatformRole(v: string): v is PlatformRole {
  return v in PLATFORM_ROLE_LABELS;
}
