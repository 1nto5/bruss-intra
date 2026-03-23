"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { getNextSequenceValue } from "@/lib/db/counter";
import { Locale } from "@/lib/config/i18n";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { getDictionary } from "../lib/dict";
import { createCorrectionSchema } from "../lib/zod";
import { AUTO_TARGET_WAREHOUSES, APPROVAL_REQUIREMENTS } from "../lib/constants";
import { writeAuditLog } from "./utils";
import * as z from "zod";

type FieldChange = {
  field: string;
  old?: unknown;
  new?: unknown;
};

const ITEM_FIELDS = [
  "articleNumber",
  "articleName",
  "quarry",
  "batch",
  "quantity",
  "comment",
] as const;

function generateEditDetails(
  original: Record<string, unknown>,
  updated: { type: string; sourceWarehouse: string; targetWarehouse: string; reason: string; items: Record<string, unknown>[] },
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (original.type !== updated.type) {
    changes.push({ field: "type", old: original.type, new: updated.type });
  }

  if (original.sourceWarehouse !== updated.sourceWarehouse) {
    changes.push({ field: "sourceWarehouse", old: original.sourceWarehouse, new: updated.sourceWarehouse });
  }

  if (original.targetWarehouse !== updated.targetWarehouse) {
    changes.push({ field: "targetWarehouse", old: original.targetWarehouse, new: updated.targetWarehouse });
  }

  if (original.reason !== updated.reason) {
    changes.push({ field: "reason", old: original.reason, new: updated.reason });
  }

  const oldItems = (original.items as Record<string, unknown>[]) || [];
  const newItems = updated.items || [];
  const maxLen = Math.max(oldItems.length, newItems.length);

  for (let i = 0; i < maxLen; i++) {
    const oldItem = oldItems[i];
    const newItem = newItems[i];

    if (!oldItem && newItem) {
      changes.push({ field: `items[${i}]`, new: "added" });
      continue;
    }

    if (oldItem && !newItem) {
      changes.push({ field: `items[${i}]`, old: "removed" });
      continue;
    }

    for (const key of ITEM_FIELDS) {
      const oldVal = oldItem[key] ?? "";
      const newVal = newItem[key] ?? "";
      if (String(oldVal) !== String(newVal)) {
        changes.push({
          field: `items[${i}].${key}`,
          old: oldVal,
          new: newVal,
        });
      }
    }
  }

  return changes;
}

/**
 * Insert new warehouse correction
 * Available to all authenticated users
 */
export async function insertCorrection(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const dict = await getDictionary(lang);
    const schema = createCorrectionSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: "validation", issues: result.error.issues };
    }

    const validatedData = result.data;
    const year = new Date().getFullYear();
    const shortYear = year.toString().slice(-2);
    const seq = await getNextSequenceValue("wh_corrections", year);
    const correctionNumber = `${seq}/${shortYear}`;

    // Calculate values
    const items = validatedData.items.map((item) => ({
      ...item,
      value: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const totalValue = Math.round(
      items.reduce((sum, item) => sum + item.value, 0) * 100,
    ) / 100;

    const targetWarehouse =
      AUTO_TARGET_WAREHOUSES[validatedData.type] || validatedData.targetWarehouse;

    const collection = await dbc("wh_corrections");
    const insertResult = await collection.insertOne({
      correctionNumber,
      type: validatedData.type,
      sourceWarehouse: validatedData.sourceWarehouse,
      targetWarehouse,
      reason: validatedData.reason,
      status: "draft",
      items,
      totalValue,
      createdAt: new Date(),
      createdBy: userEmail,
    });

    if (insertResult.insertedId) {
      await writeAuditLog(
        insertResult.insertedId,
        "created",
        userEmail,
      );
      revalidateTag("warehouse-corrections", { expire: 0 });
      return { success: insertResult.insertedId.toString() };
    }

    return { error: "not inserted" };
  } catch (error) {
    console.error(error);
    return { error: "insertCorrection server action error" };
  }
}

/**
 * Update warehouse correction (draft or rejected only)
 * Only author or admin can edit
 */
export async function updateCorrection(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const dict = await getDictionary(lang);
    const schema = createCorrectionSchema(dict.validation);
    const result = schema.safeParse(data);

    if (!result.success) {
      return { error: "validation", issues: result.error.issues };
    }

    const validatedData = result.data;
    if (!validatedData._id) {
      return { error: "missing _id" };
    }

    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({
      _id: new ObjectId(validatedData._id),
    });

    if (!correction) {
      return { error: "not found" };
    }

    // Permission check: author or admin, status draft/rejected
    const isAdmin = session.user.roles?.includes("admin");
    if (correction.createdBy !== userEmail && !isAdmin) {
      return { error: "unauthorized" };
    }
    if (correction.status !== "draft" && correction.status !== "rejected") {
      return { error: "invalid status" };
    }

    // Recalculate values
    const items = validatedData.items.map((item) => ({
      ...item,
      value: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const totalValue = Math.round(
      items.reduce((sum, item) => sum + item.value, 0) * 100,
    ) / 100;

    const targetWarehouse =
      AUTO_TARGET_WAREHOUSES[validatedData.type] || validatedData.targetWarehouse;

    const res = await collection.updateOne(
      { _id: new ObjectId(validatedData._id) },
      {
        $set: {
          type: validatedData.type,
          sourceWarehouse: validatedData.sourceWarehouse,
          targetWarehouse,
          reason: validatedData.reason,
          items,
          totalValue,
          editedAt: new Date(),
          editedBy: userEmail,
        },
      },
    );

    if (res.matchedCount > 0) {
      const changes = generateEditDetails(correction, {
        type: validatedData.type,
        sourceWarehouse: validatedData.sourceWarehouse,
        targetWarehouse,
        reason: validatedData.reason,
        items,
      });
      await writeAuditLog(
        validatedData._id,
        "edited",
        userEmail,
        changes.length > 0 ? { changes } : undefined,
      );
      revalidateTag("warehouse-corrections", { expire: 0 });
      return { success: "updated" };
    }

    return { error: "not updated" };
  } catch (error) {
    console.error(error);
    return { error: "updateCorrection server action error" };
  }
}

/**
 * Submit warehouse correction for approval
 * Creates approval records based on correction type requirements
 */
export async function submitCorrection(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({ _id: new ObjectId(id) });

    if (!correction) {
      return { error: "not found" };
    }

    // Permission check
    const isAdmin = session.user.roles?.includes("admin");
    if (correction.createdBy !== userEmail && !isAdmin) {
      return { error: "unauthorized" };
    }
    if (correction.status !== "draft" && correction.status !== "rejected") {
      return { error: "invalid status" };
    }
    if (!correction.items || correction.items.length === 0) {
      return { error: "no items" };
    }

    const wasRejected = correction.status === "rejected";

    // Get required approval roles
    const requiredRoles = APPROVAL_REQUIREMENTS[correction.type as keyof typeof APPROVAL_REQUIREMENTS];

    // Delete old approval records (in case of resubmission)
    const approvalsColl = await dbc("wh_corrections_approvals");
    await approvalsColl.deleteMany({ correctionId: new ObjectId(id) });

    // Create new pending approval records
    await approvalsColl.insertMany(
      requiredRoles.map((role) => ({
        correctionId: new ObjectId(id),
        correctionNumber: correction.correctionNumber,
        role,
        status: "pending",
        createdAt: new Date(),
      })),
    );

    // Update correction status
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "in-approval",
          submittedAt: new Date(),
          submittedBy: userEmail,
        },
        $unset: {
          rejectedAt: "",
          rejectedBy: "",
          rejectionReason: "",
          completedAt: "",
        },
      },
    );

    await writeAuditLog(
      id,
      wasRejected ? "resubmitted" : "submitted",
      userEmail,
    );

    revalidateTag("warehouse-corrections", { expire: 0 });
    revalidateTag("warehouse-corrections-approvals", { expire: 0 });
    return { success: "submitted" };
  } catch (error) {
    console.error(error);
    return { error: "submitCorrection server action error" };
  }
}

/**
 * Cancel draft warehouse correction
 * Only author or admin can cancel
 */
export async function findArticle(
  articleNumber: string,
): Promise<
  | { success: { articleName: string; unitPrice: number } }
  | { error: string }
> {
  try {
    const collection = await dbc("wh_corrections_articles");
    const res = await collection.findOne({ articleNumber, active: true });
    if (res) {
      return {
        success: {
          articleName: res.articleName as string,
          unitPrice: res.unitPrice as number,
        },
      };
    }
    return { error: "not found" };
  } catch (error) {
    console.error(error);
    return { error: "findArticle server action error" };
  }
}

/**
 * Cancel draft warehouse correction
 * Only author or admin can cancel
 */
export async function cancelCorrection(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({ _id: new ObjectId(id) });

    if (!correction) {
      return { error: "not found" };
    }

    const isAdmin = session.user.roles?.includes("admin");
    if (correction.createdBy !== userEmail && !isAdmin) {
      return { error: "unauthorized" };
    }
    if (correction.status !== "draft") {
      return { error: "invalid status" };
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: userEmail,
        },
      },
    );

    await writeAuditLog(id, "cancelled", userEmail);
    revalidateTag("warehouse-corrections", { expire: 0 });
    return { success: "cancelled" };
  } catch (error) {
    console.error(error);
    return { error: "cancelCorrection server action error" };
  }
}

/**
 * Soft-delete warehouse correction (admin only)
 * Sets deletedAt/deletedBy without changing status
 */
export async function deleteCorrection(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    if (!session.user.roles?.includes("admin")) {
      return { error: "unauthorized" };
    }

    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({ _id: new ObjectId(id) });

    if (!correction) {
      return { error: "not found" };
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: userEmail,
        },
      },
    );

    await writeAuditLog(id, "deleted", userEmail);
    revalidateTag("warehouse-corrections", { expire: 0 });
    return { success: "deleted" };
  } catch (error) {
    console.error(error);
    return { error: "deleteCorrection server action error" };
  }
}

/**
 * Reactivate cancelled warehouse correction (admin only)
 * Changes status from cancelled -> draft
 */
export async function reactivateCorrection(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    if (!session.user.roles?.includes("admin")) {
      return { error: "unauthorized" };
    }

    const collection = await dbc("wh_corrections");
    const correction = await collection.findOne({ _id: new ObjectId(id) });

    if (!correction) {
      return { error: "not found" };
    }

    if (correction.status !== "cancelled") {
      return { error: "invalid status" };
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "draft",
          reactivatedAt: new Date(),
          reactivatedBy: userEmail,
        },
        $unset: {
          cancelledAt: "",
          cancelledBy: "",
        },
      },
    );

    await writeAuditLog(id, "reactivated", userEmail);
    revalidateTag("warehouse-corrections", { expire: 0 });
    return { success: "reactivated" };
  } catch (error) {
    console.error(error);
    return { error: "reactivateCorrection server action error" };
  }
}
