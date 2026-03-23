"use server";

import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Revalidate warehouse corrections cache
 */
export async function revalidateCorrections() {
  revalidateTag("warehouse-corrections", { expire: 0 });
  revalidateTag("warehouse-corrections-approvals", { expire: 0 });
  revalidateTag("warehouse-corrections-statistics", { expire: 0 });
}

/**
 * Redirect to warehouse corrections list
 */
export async function redirectToCorrections(lang: string) {
  redirect(`/${lang}/warehouse-corrections`);
}

/**
 * Write audit log entry for warehouse correction action
 */
export async function writeAuditLog(
  correctionId: string | ObjectId,
  action: string,
  performedBy: string,
  details?: Record<string, unknown>,
) {
  const collection = await dbc("wh_corrections_audit_log");
  await collection.insertOne({
    correctionId:
      typeof correctionId === "string"
        ? new ObjectId(correctionId)
        : correctionId,
    action,
    performedBy,
    performedAt: new Date(),
    ...(details && { details }),
  });
}
