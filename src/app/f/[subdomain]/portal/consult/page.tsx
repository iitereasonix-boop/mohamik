import { getPortal } from "@/lib/portal";
import FormPage from "@/components/portal/FormPage";
import PortalConsultForm from "../PortalConsultForm";

export default async function ConsultPage({ params }: { params: { subdomain: string } }) {
  const { firm, client } = await getPortal(params.subdomain);

  return (
    <FormPage
      eyebrow="الاستشارات"
      title="طلب استشارة"
      text={`اشرح موضوعك باختصار، وسيصل طلبك إلى الفريق المختص في ${firm.name}.`}
      steps={["يصل طلبك إلى صندوق طلبات المكتب.", "يراجعه المحامي المختص في المكتب.", "يتواصل معك المكتب عادة خلال يوم عمل."]}
    >
      <PortalConsultForm
        subdomain={firm.subdomain}
        defaults={client ? { name: client.name, mobile: client.mobile, email: client.email } : undefined}
      />
    </FormPage>
  );
}
