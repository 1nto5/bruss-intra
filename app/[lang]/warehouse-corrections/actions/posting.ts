"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { canPost } from "../lib/permissions";
import { writeAuditLog } from "./utils";

/**
 * Mark approved warehouse correction as posted
 * Only users with posting permission can perform this action
 */
export async function markAsPosted(
  correctionId: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    if (!canPost(session.user.roles || [])) {
      return { error: "unauthorized" };
    }

    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({
      _id: new ObjectId(correctionId),
    });

    if (!correction) {
      return { error: "not found" };
    }

    if (correction.status !== "approved") {
      return { error: "invalid status" };
    }

    await collection.updateOne(
      { _id: new ObjectId(correctionId) },
      {
        $set: {
          status: "posted",
          postedAt: new Date(),
          postedBy: userEmail,
        },
      },
    );

    await writeAuditLog(correctionId, "posted", userEmail);
    revalidateTag("warehouse-corrections", { expire: 0 });
    return { success: "posted" };
  } catch (error) {
    console.error(error);
    return { error: "markAsPosted server action error" };
  }
}
