"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { getApprovalRolesForUser } from "../lib/permissions";
import { writeAuditLog } from "./utils";

/**
 * Approve warehouse correction
 * Multi-role auto-approval: approves all matching approval roles at once
 */
export async function approveCorrection(
  correctionId: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const userApprovalRoles = getApprovalRolesForUser(
      session.user.roles || [],
    );
    if (userApprovalRoles.length === 0) {
      return { error: "unauthorized" };
    }

    const approvalsColl = await dbc("wh_corrections_approvals");
    const correctionsColl = await dbc("wh_corrections");
    const correctionOid = new ObjectId(correctionId);

    // Find pending approvals matching the user's roles
    const matchingPending = await approvalsColl
      .find({
        correctionId: correctionOid,
        role: { $in: userApprovalRoles },
        status: "pending",
      })
      .toArray();

    if (matchingPending.length === 0) {
      return { error: "already approved" };
    }

    // Multi-role auto-approval: approve ALL matching roles at once
    const approvedRoles = matchingPending.map((a) => a.role);
    await approvalsColl.updateMany(
      {
        correctionId: correctionOid,
        role: { $in: userApprovalRoles },
        status: "pending",
      },
      {
        $set: {
          status: "approved",
          decidedBy: userEmail,
          decidedAt: new Date(),
        },
      },
    );

    // Check if ALL approvals for this correction are now approved
    const remainingPending = await approvalsColl.countDocuments({
      correctionId: correctionOid,
      status: "pending",
    });

    if (remainingPending === 0) {
      // All approved - transition correction to "approved"
      await correctionsColl.updateOne(
        { _id: correctionOid },
        {
          $set: {
            status: "approved",
            completedAt: new Date(),
          },
        },
      );
    }

    await writeAuditLog(correctionId, "approved", userEmail, {
      roles: approvedRoles,
    });

    revalidateTag("warehouse-corrections", { expire: 0 });
    revalidateTag("warehouse-corrections-approvals", { expire: 0 });
    return { success: "approved" };
  } catch (error) {
    console.error(error);
    return { error: "approveCorrection server action error" };
  }
}

/**
 * Reject warehouse correction
 * Cascades rejection to all remaining pending approvals
 */
export async function rejectCorrection(
  correctionId: string,
  reason: string,
): Promise<{ success: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect("/auth?callbackUrl=/warehouse-corrections");
  }
  const userEmail = session!.user!.email as string;

  try {
    const userApprovalRoles = getApprovalRolesForUser(
      session.user.roles || [],
    );
    if (userApprovalRoles.length === 0) {
      return { error: "unauthorized" };
    }

    if (!reason || reason.length < 10) {
      return { error: "rejection reason too short" };
    }

    const approvalsColl = await dbc("wh_corrections_approvals");
    const correctionsColl = await dbc("wh_corrections");
    const correctionOid = new ObjectId(correctionId);

    // Verify user has a matching pending approval
    const matchingPending = await approvalsColl.countDocuments({
      correctionId: correctionOid,
      role: { $in: userApprovalRoles },
      status: "pending",
    });

    if (matchingPending === 0) {
      return { error: "unauthorized" };
    }

    // Reject the user's matching approval record(s)
    await approvalsColl.updateMany(
      {
        correctionId: correctionOid,
        role: { $in: userApprovalRoles },
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          decidedBy: userEmail,
          decidedAt: new Date(),
          rejectionReason: reason,
        },
      },
    );

    // Cascade: reject ALL remaining pending approvals (they become moot)
    await approvalsColl.updateMany(
      {
        correctionId: correctionOid,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          decidedBy: userEmail,
          decidedAt: new Date(),
          rejectionReason: "Cascaded from another rejection",
        },
      },
    );

    // Set correction status to rejected
    await correctionsColl.updateOne(
      { _id: correctionOid },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: userEmail,
          rejectionReason: reason,
          completedAt: new Date(),
        },
      },
    );

    await writeAuditLog(correctionId, "rejected", userEmail, {
      reason,
    });

    revalidateTag("warehouse-corrections", { expire: 0 });
    revalidateTag("warehouse-corrections-approvals", { expire: 0 });
    return { success: "rejected" };
  } catch (error) {
    console.error(error);
    return { error: "rejectCorrection server action error" };
  }
}
