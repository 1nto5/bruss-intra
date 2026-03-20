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
  "sourceWarehouse",
  "targetWarehouse",
  "reason",
  "comment",
] as const;

function generateEditDetails(
  original: Record<string, unknown>,
  updated: { type: string; items: Record<string, unknown>[] },
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (original.type !== updated.type) {
    changes.push({ field: "type", old: original.type, new: updated.type });
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
    const seq = await getNextSequenceValue("wh_corrections", year);
    const correctionNumber = `WC-${year}-${String(seq).padStart(3, "0")}`;

    // Calculate values and apply auto target warehouses
    const items = validatedData.items.map((item) => ({
      ...item,
      targetWarehouse:
        AUTO_TARGET_WAREHOUSES[validatedData.type] || item.targetWarehouse,
      value: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const totalValue = Math.round(
      items.reduce((sum, item) => sum + item.value, 0) * 100,
    ) / 100;

    const collection = await dbc("wh_corrections");
    const insertResult = await collection.insertOne({
      correctionNumber,
      type: validatedData.type,
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
      targetWarehouse:
        AUTO_TARGET_WAREHOUSES[validatedData.type] || item.targetWarehouse,
      value: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const totalValue = Math.round(
      items.reduce((sum, item) => sum + item.value, 0) * 100,
    ) / 100;

    const res = await collection.updateOne(
      { _id: new ObjectId(validatedData._id) },
      {
        $set: {
          type: validatedData.type,
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
