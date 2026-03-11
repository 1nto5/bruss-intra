import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { getUsers } from "@/lib/data/get-users";
import { redirect } from "next/navigation";
import AddCorrectiveActionForm from "../../../components/add-corrective-action-form";
import { getDictionary } from "../../../lib/dict";

export default async function AddDeviationPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/auth?callbackUrl=/deviations");
  }
  const params = await props.params;

  const { lang, id } = params;

  const dict = await getDictionary(lang);
  const users = await getUsers();
  return (
    <AddCorrectiveActionForm id={id} users={users} dict={dict} lang={lang} />
  );
}
