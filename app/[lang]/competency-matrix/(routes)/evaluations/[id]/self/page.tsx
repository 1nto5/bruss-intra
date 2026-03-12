export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../../../lib/dict";
import { COLLECTIONS } from "../../../../lib/constants";
import { SelfAssessmentForm } from "./form";

export default async function SelfAssessmentPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=/competency-matrix/evaluations/${id}/self`,
    );
  }

  if (!ObjectId.isValid(id)) notFound();

  const evaluationsColl = await dbc(COLLECTIONS.evaluations);
  const evaluation = await evaluationsColl.findOne({
    _id: new ObjectId(id),
  });

  if (!evaluation) notFound();
  if (evaluation.status !== "draft") {
    redirect(`/${lang}/competency-matrix/evaluations/${id}`);
  }

  // Only the evaluated employee can access self-assessment
  const isOwner =
    evaluation.employeeEmail?.toLowerCase() ===
    session.user.email!.toLowerCase();
  if (!isOwner) {
    redirect(`/${lang}/competency-matrix/evaluations/${id}`);
  }

  return (
    <SelfAssessmentForm
      evaluationId={id}
      employeeName={evaluation.employeeName}
      initialRatings={evaluation.ratings}
      lang={lang}
      dict={dict}
    />
  );
}
