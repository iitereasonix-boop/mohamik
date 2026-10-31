import { redirect } from "next/navigation";
import { getPortal } from "@/lib/portal";
import FormPage from "@/components/portal/FormPage";
import ClientRegistrationForm from "./ClientRegistrationForm";

export default async function ClientRegistrationPage({ params }: { params: { subdomain: string } }) {
  const { firm, client } = await getPortal(params.subdomain);
  if (client) redirect(`/f/${firm.subdomain}/portal`);

  return (
    <FormPage
      eyebrow="حساب العميل"
      title="إنشاء حساب عميل"
      text={`حسابك خاص بك وبـ ${firm.name} فقط. لا يستطيع أي عميل آخر الاطلاع على قضاياك أو مستنداتك.`}
      steps={["أنشئ حسابك بالاسم والجوال والبريد.", "يربط المكتب قضيتك بحسابك عند فتح ملفها.", "تابع الجلسات والتحديثات والمواعيد من البوابة."]}
    >
      <ClientRegistrationForm subdomain={firm.subdomain} />
    </FormPage>
  );
}
