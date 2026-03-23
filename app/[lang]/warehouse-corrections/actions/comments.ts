"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { getDictionary } from "../lib/dict";
import { createCommentSchema } from "../lib/zod";
import { writeAuditLog } from "./utils";
import * as z from "zod";

/**
 * Add comment to warehouse correction
 * Available to all authenticated users, except on cancelled corrections
 */
export async function addComment(
  correctionId: string,
  content: string,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const dict = await getDictionary(lang);
    const schema = createCommentSchema(dict.validation);
    const result = schema.safeParse({ content });

    if (!result.success) {
      return { error: "validation", issues: result.error.issues };
    }

    // Verify correction exists and is not cancelled
    const correctionsColl = await dbc("wh_corrections");
    const correction = await correctionsColl.findOne({
      _id: new ObjectId(correctionId),
    });

    if (!correction) {
      return { error: "not found" };
    }

    if (correction.status === "cancelled") {
      return { error: "invalid status" };
    }

    const commentsColl = await dbc("wh_corrections_comments");
    await commentsColl.insertOne({
      correctionId: new ObjectId(correctionId),
      content: result.data.content,
      createdBy: userEmail,
      createdAt: new Date(),
    });

    await writeAuditLog(correctionId, "commented", userEmail);
    revalidateTag("warehouse-corrections", { expire: 0 });
    return { success: "comment added" };
  } catch (error) {
    console.error(error);
    return { error: "addComment server action error" };
  }
}
