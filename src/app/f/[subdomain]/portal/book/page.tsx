import { getPortal } from "@/lib/portal";
import FormPage from "@/components/portal/FormPage";
import BookingForm from "./BookingForm";

export default async function BookPage({ params }: { params: { subdomain: string } }) {
  const { firm, client } = await getPortal(params.subdomain);

  return (
    <FormPage
      eyebrow="المواعيد"
      title="حجز موعد"
      text={`اختر نوع الموعد واليوم المناسب لك مع ${firm.name}.`}
      steps={["يصل طلبك إلى صندوق طلبات المكتب فورًا.", "يراجع المكتب الطلب ويؤكد الموعد معك.", "تجد الموعد في صفحتك الرئيسية داخل البوابة."]}
    >
      <BookingForm
        subdomain={firm.subdomain}
        defaults={client ? { name: client.name, mobile: client.mobile, email: client.email } : undefined}
      />
    </FormPage>
  );
}
