import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../lib/dict";
import { COLLECTIONS } from "../../../../lib/constants";
import { canManageCompetencies } from "../../../../lib/permissions";
import { CompetencyForm } from "../../../../components/competencies/competency-form";

export default async function EditCompetencyPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/competencies/${id}/edit`,
    );
  }

  const userRoles = session.user.roles ?? [];
  if (!canManageCompetencies(userRoles)) {
    redirect(`/${lang}/competency-matrix`);
  }

  const coll = await dbc(COLLECTIONS.competencies);
  const doc = await coll.findOne({ _id: new ObjectId(id) });
  if (!doc) notFound();

  const competency = {
    ...doc,
    _id: doc._id.toString(),
  } as unknown as import("../../../../lib/types").CompetencyType;

  return <CompetencyForm dict={dict} lang={lang} competency={competency} />;
}
