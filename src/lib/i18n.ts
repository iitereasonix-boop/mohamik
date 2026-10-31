// Arabic-first (RTL) i18n with an English switch.
export type Lang = "ar" | "en";

const dict = {
  // common
  appName: { ar: "Mohamik – منصة مكاتب المحامين", en: "Mohamik – Legal Platform" },
  login: { ar: "تسجيل الدخول", en: "Sign in" },
  logout: { ar: "خروج", en: "Sign out" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  search: { ar: "بحث (اسم عميل، هاتف، رقم هوية، رقم قضية)", en: "Search (client, phone, ID, case no.)" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  // management room
  dashboard: { ar: "لوحة القيادة", en: "Dashboard" },
  clients: { ar: "العملاء", en: "Clients" },
  cases: { ar: "القضايا", en: "Cases" },
  calendar: { ar: "التقويم", en: "Calendar" },
  intake: { ar: "صندوق الطلبات", en: "Intake inbox" },
  tasks: { ar: "المهام", en: "Tasks" },
  documents: { ar: "المستندات", en: "Documents" },
  settings: { ar: "الإعدادات", en: "Settings" },
  todayHearings: { ar: "جلسات اليوم", en: "Today's hearings" },
  todayAppointments: { ar: "مواعيد اليوم", en: "Today's appointments" },
  deadlines7: { ar: "مواعيد نهائية خلال 7 أيام", en: "Deadlines in 7 days" },
  newCaseRequests: { ar: "طلبات قضايا جديدة", en: "New case requests" },
  overdueTasks: { ar: "مهام متأخرة", en: "Overdue tasks" },
  unreadMessages: { ar: "رسائل عملاء غير مقروءة", en: "Unread client messages" },
  // client portal
  myCases: { ar: "قضاياي", en: "My cases" },
  bookAppointment: { ar: "حجز موعد", en: "Book appointment" },
  newCaseRequest: { ar: "طلب استشارة / قضية جديدة", en: "New case request" },
  nextHearing: { ar: "الجلسة القادمة", en: "Next hearing" },
  sendMessage: { ar: "إرسال رسالة", en: "Send message" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  // status labels (always paired with colours)
  status: {
    ar: { INTAKE_REVIEW: "قيد المراجعة", ACTIVE: "نشطة", SUSPENDED: "موقوفة", CLOSED_WON: "مغلقة – مكسب", CLOSED_LOST: "مغلقة – خسارة", CLOSED_SETTLED: "مغلقة – تسوية", CLOSED_OTHER: "مغلقة – أخرى" },
    en: { INTAKE_REVIEW: "Under review", ACTIVE: "Active", SUSPENDED: "Suspended", CLOSED_WON: "Closed – Won", CLOSED_LOST: "Closed – Lost", CLOSED_SETTLED: "Closed – Settled", CLOSED_OTHER: "Closed – Other" },
  },
  caseType: {
    ar: {
      CRIMINAL: "جزائية", CIVIL: "مدنية", COMMERCIAL: "تجارية", LABOUR: "عمالية",
      FAMILY: "أحوال شخصية", REAL_ESTATE: "عقارية وإيجارات", COMPANIES: "شركات",
      CYBERCRIME: "جرائم إلكترونية", ENFORCEMENT: "تنفيذ", OTHER: "أخرى",
    },
    en: {
      CRIMINAL: "Criminal", CIVIL: "Civil", COMMERCIAL: "Commercial", LABOUR: "Labour",
      FAMILY: "Family", REAL_ESTATE: "Real estate & rent", COMPANIES: "Companies",
      CYBERCRIME: "Cybercrime", ENFORCEMENT: "Enforcement", OTHER: "Other",
    },
  },
  caseStage: {
    ar: {
      PRE_LITIGATION: "ما قبل التقاضي", FIRST_INSTANCE: "أول درجة",
      APPEAL: "استئناف", CASSATION: "تمييز", ENFORCEMENT: "تنفيذ",
    },
    en: {
      PRE_LITIGATION: "Pre-litigation", FIRST_INSTANCE: "First instance",
      APPEAL: "Appeal", CASSATION: "Cassation", ENFORCEMENT: "Enforcement",
    },
  },
  toastSavedAppointment: { ar: "تم حفظ موعد الجلسة", en: "Hearing appointment saved" },
  aiFooter: {
    ar: "تحليل ذكاء اصطناعي لدعم المحامي – القرار القانوني النهائي للمحامي",
    en: "AI analysis to support the lawyer – the final legal decision belongs to the lawyer",
  },
} as const;

export function t(key: keyof typeof dict, lang: Lang = "ar"): string {
  const entry = (dict as any)[key];
  if (!entry) return key as string;
  if (typeof entry === "string") return entry;
  return (lang === "ar" ? entry.ar : entry.en) ?? (key as string);
}

// Arabic normalisation: hamza, taa marbuta, diacritics (used by search + Phase 3 FTS)
export function normaliseArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652]/g, "") // diacritics
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // آأإ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A") // ئ → ي
    .trim()
    .toLowerCase();
}
