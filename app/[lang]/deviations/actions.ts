'use server';

import {
  ApprovalHistoryType,
  ApprovalType,
  CancellationType,
  correctiveActionType,
  DeviationType, // Import NotificationLogType
  EditLogEntryType,
  NoteType,
  NotificationLogType, // Import NotificationLogType
} from '@/app/[lang]/deviations/lib/types';
import { auth } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/db/counter';
import { dbc } from '@/lib/db/mongo';
import {
  approvalDecisionNotification,
  correctiveActionAssignmentNotification,
  deviationNoGroupLeaderNotification,
  deviationRoleNotification,
  deviationVacancyNotification,
  plantManagerFinalApprovalNotification,
  printImplementationNotification,
  rejectionReevaluationNotification,
} from '@/lib/services/email-templates';
import mailer from '@/lib/services/mailer';
import { formatDate } from '@/lib/utils/date-format';
import { Collection, ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  AddCorrectiveActionType,
  AddDeviationDraftType,
  AddDeviationType,
} from './lib/zod'; // Assuming EditLogEntryType is defined in types.ts, not zod

// Define a simple user type for annotation
interface UserWithRoles {
  email: string;
  roles: string[];
  // Add other potential user fields if known, or use a more generic approach
  [key: string]: any;
}

// Define approval roles
const APPROVAL_ROLES = [
  'group-leader',
  'quality-manager',
  'production-manager',
  'plant-manager',
] as const;

// --- Notification Helper Functions ---

async function sendGroupLeaderNotification(
  deviationId: ObjectId,
  internalId: string,
  deviationArea: string | undefined,
  notificationContext: 'creation' | 'edit', // Added context
  usersColl: Collection,
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];
  const targetRole = deviationArea ? `group-leader-${deviationArea}` : null;
  let targetGroupLeaders: UserWithRoles[] = [];

  if (targetRole) {
    targetGroupLeaders = (await usersColl
      .find({ roles: { $all: ['group-leader', targetRole] } })
      .toArray()) as unknown as UserWithRoles[];
  }

  const uniqueEmails = Array.from(
    new Set(targetGroupLeaders.map((user) => user.email).filter(Boolean)),
  );

  if (uniqueEmails.length > 0) {
    const { subject, html } = deviationRoleNotification({
      internalId,
      deviationUrl,
      role: 'group-leader',
      area: deviationArea,
      isEdit: notificationContext === 'edit',
      lang: 'pl', // Group Leaders receive Polish
    });

    for (const email of uniqueEmails) {
      try {
        await mailer({ to: email, subject, html });
        logs.push({
          to: email,
          sentAt: new Date(),
          type:
            notificationContext === 'creation'
              ? 'creation-group-leader'
              : 'edit-group-leader', // Context-based type
        });
      } catch (e) {
        console.error(`Failed GL mail to ${email}:`, e);
      }
    }
  } else {
    // Return empty logs, handle notification to Plant Manager in handleNotifications
  }
  return logs;
}

// NEW function to notify Plant Manager about a specific vacant role
async function sendVacancyNotificationToPlantManager(
  deviationId: ObjectId,
  internalId: string,
  vacantRole: string, // The specific role that is vacant
  notificationContext: 'creation' | 'edit',
  usersColl: Collection,
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];
  const plantManagers = (await usersColl
    .find({ roles: 'plant-manager' })
    .toArray()) as unknown as UserWithRoles[];
  const uniqueEmails = Array.from(
    new Set(plantManagers.map((user) => user.email).filter(Boolean)),
  );

  if (uniqueEmails.length > 0) {
    const { subject, html } = deviationVacancyNotification({
      internalId,
      deviationUrl,
      vacantRole,
      isEdit: notificationContext === 'edit',
    });

    for (const email of uniqueEmails) {
      try {
        await mailer({ to: email, subject, html });
        logs.push({
          to: email,
          sentAt: new Date(),
          type:
            notificationContext === 'creation'
              ? `creation-vacant-role-${vacantRole}`
              : `edit-vacant-role-${vacantRole}`,
        });
      } catch (e) {
        console.error(
          `Failed Vacancy (${vacantRole}) mail to Plant Manager ${email}:`,
          e,
        );
      }
    }
  } else {
    console.error(
      `Vacancy detected for role (${vacantRole}) in [${internalId}], but no Plant Manager found!`,
    );
  }
  return logs;
}

async function sendNoGroupLeaderNotification(
  deviationId: ObjectId,
  internalId: string,
  deviationArea: string | undefined,
  notificationContext: 'creation' | 'edit', // Added context
  usersColl: Collection,
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];
  // This function is only called if sendGroupLeaderNotification found no specific leader
  const plantManagers = (await usersColl
    .find({ roles: 'plant-manager' })
    .toArray()) as unknown as UserWithRoles[];
  const uniqueEmails = Array.from(
    new Set(plantManagers.map((user) => user.email).filter(Boolean)),
  );

  if (uniqueEmails.length > 0) {
    const { subject, html } = deviationNoGroupLeaderNotification({
      internalId,
      deviationUrl,
      area: deviationArea || '',
      isEdit: notificationContext === 'edit',
    });

    for (const email of uniqueEmails) {
      try {
        await mailer({ to: email, subject, html });
        logs.push({
          to: email,
          sentAt: new Date(),
          type:
            notificationContext === 'creation'
              ? 'no-group-leader'
              : 'edit-no-group-leader',
        });
      } catch (e) {
        console.error(`Failed No-GL mail to Plant Manager ${email}:`, e);
      }
    }
  } else {
    console.error(
      `No GL found for area ${deviationArea || 'N/A'} in [${internalId}], and no Plant Manager found to notify!`,
    );
  }
  return logs;
}

// Ensure sendRoleNotification uses the standard body format
async function sendRoleNotification(
  deviationId: ObjectId,
  internalId: string,
  role: string, // Role to notify (e.g., 'quality-manager')
  notificationContext: 'creation' | 'edit', // Added context
  usersColl: Collection,
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];
  const targetUsers = (await usersColl
    .find({ roles: role })
    .toArray()) as unknown as UserWithRoles[];

  const uniqueEmails = Array.from(
    new Set(targetUsers.map((user) => user.email).filter(Boolean)),
  );

  if (uniqueEmails.length > 0) {
    const { subject, html } = deviationRoleNotification({
      internalId,
      deviationUrl,
      role,
      isEdit: notificationContext === 'edit',
    });

    for (const email of uniqueEmails) {
      try {
        await mailer({ to: email, subject, html });
        logs.push({
          to: email,
          sentAt: new Date(),
          type:
            notificationContext === 'creation'
              ? `creation-${role}`
              : `edit-${role}`,
        });
      } catch (e) {
        console.error(`Failed ${role} mail to ${email}:`, e);
      }
    }
  } else {
    // Return empty logs, handle vacancy notification in handleNotifications
  }
  return logs;
}

// Refactored handleNotifications logic
async function handleNotifications(
  deviation: DeviationType,
  deviationId: ObjectId,
  notificationContext: 'creation' | 'edit',
) {
  const allNotificationLogs: NotificationLogType[] = [];
  const deviationUrl = `${process.env.BASE_URL}/deviations/${deviationId.toString()}`;
  const internalId = deviation.internalId!; // Assume internalId exists

  try {
    const usersColl = await dbc('users');
    const deviationsColl = await dbc('deviations');

    // 1. Group Leader Notification (+ Fallback)
    const glLogs = await sendGroupLeaderNotification(
      deviationId,
      internalId,
      deviation.area,
      notificationContext,
      usersColl,
      deviationUrl,
    );
    allNotificationLogs.push(...glLogs);

    // If no specific GL found for the area, notify Plant Manager (as fallback)
    if (glLogs.length === 0 && deviation.area) {
      const noGlLogs = await sendNoGroupLeaderNotification(
        deviationId,
        internalId,
        deviation.area,
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...noGlLogs);
    }

    // 2. Quality Manager Notification (+ Vacancy Fallback)
    const qualityManagerExists = await usersColl.findOne({
      roles: 'quality-manager',
    });
    if (qualityManagerExists) {
      const qmLogs = await sendRoleNotification(
        deviationId,
        internalId,
        'quality-manager',
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...qmLogs);
    } else {
      const vacancyQmLogs = await sendVacancyNotificationToPlantManager(
        deviationId,
        internalId,
        'quality-manager', // Specify vacant role
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...vacancyQmLogs);
    }

    // 3. Production Manager Notification (+ Vacancy Fallback)
    const productionManagerExists = await usersColl.findOne({
      roles: 'production-manager',
    });
    if (productionManagerExists) {
      const pmLogs = await sendRoleNotification(
        deviationId,
        internalId,
        'production-manager',
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...pmLogs);
    } else {
      const vacancyPmLogs = await sendVacancyNotificationToPlantManager(
        deviationId,
        internalId,
        'production-manager', // Specify vacant role
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...vacancyPmLogs);
    }

    // 4. Plant Manager Notification - MODIFIED to only notify when:
    // a) There are vacancies (already handled above)
    // b) All other roles have already approved
    // Check if all other approvals are in place
    const allOtherRolesApproved = [
      'group-leader',
      'quality-manager',
      'production-manager',
    ].every((role) => {
      const approvalFieldMap: { [key: string]: keyof DeviationType } = {
        'group-leader': 'groupLeaderApproval',
        'quality-manager': 'qualityManagerApproval',
        'production-manager': 'productionManagerApproval',
      };
      const fieldName = approvalFieldMap[role];
      return (
        (deviation[fieldName] as ApprovalType | undefined)?.approved === true
      );
    });

    // If all other roles approved, notify Plant Manager
    if (allOtherRolesApproved) {
      const plantManagerLogs = await sendRoleNotification(
        deviationId,
        internalId,
        'plant-manager',
        notificationContext,
        usersColl,
        deviationUrl,
      );
      allNotificationLogs.push(...plantManagerLogs);
    }

    // 5. Update Deviation with All Logs
    if (allNotificationLogs.length > 0) {
      try {
        // Deduplicate logs based on 'to' and 'type' to avoid redundant entries if notified multiple ways
        const uniqueLogs = allNotificationLogs.reduce(
          (acc: NotificationLogType[], current) => {
            const x = acc.find(
              (item) => item.to === current.to && item.type === current.type,
            );
            if (!x) {
              return acc.concat([current]);
            } else {
              return acc;
            }
          },
          [],
        );

        if (notificationContext === 'creation') {
          await deviationsColl.updateOne(
            { _id: deviationId },
            { $set: { notificationLogs: uniqueLogs } },
          );
        } else {
          await deviationsColl.updateOne(
            { _id: deviationId },
            { $push: { notificationLogs: { $each: uniqueLogs } } } as any,
          );
        }
      } catch (e) {
        console.error(`Failed to update logs for [${internalId}]:`, e);
      }
    }
  } catch (e) {
    console.error(`Error handling notifications for [${internalId}]:`, e);
  }
}

// NEW function to notify the responsible person for a corrective action
async function sendCorrectiveActionAssignmentNotification(
  deviationId: ObjectId,
  internalId: string,
  correctiveAction: AddCorrectiveActionType, // Use the Zod type for input
  responsibleUserEmail: string, // Email of the person responsible
  deviationUrl: string,
): Promise<NotificationLogType | null> {
  const { subject, html } = correctiveActionAssignmentNotification({
    internalId,
    deviationUrl,
    description: correctiveAction.description,
    deadline: formatDate(correctiveAction.deadline),
  });

  try {
    await mailer({ to: responsibleUserEmail, subject, html });
    return {
      to: responsibleUserEmail,
      sentAt: new Date(),
      type: 'corrective-action-assigned', // New notification type
    };
  } catch (e) {
    console.error(
      `Failed Corrective Action assignment mail to ${responsibleUserEmail}:`,
      e,
    );
    return null; // Return null on failure
  }
}

// NEW function to notify users who rejected the deviation about updates
async function sendRejectionReevaluationNotification(
  deviation: DeviationType,
  deviationId: ObjectId,
  reason: 'corrective_action' | 'attachment', // Why re-evaluation is needed
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];
  const rejectors = new Set<string>(); // Use a Set to store unique emails

  const approvalFields: (keyof DeviationType)[] = [
    'groupLeaderApproval',
    'qualityManagerApproval',
    'productionManagerApproval',
    'plantManagerApproval',
  ];

  // Identify users who rejected
  approvalFields.forEach((field) => {
    const approval = deviation[field] as ApprovalType | undefined;
    // Find users where 'approved' is explicitly false and 'by' exists
    if (approval?.approved === false && approval.by) {
      rejectors.add(approval.by); // Add the email of the user who rejected
    }
  });

  if (rejectors.size === 0) {
    return logs; // No one to notify
  }

  const { subject, html } = rejectionReevaluationNotification({
    internalId: deviation.internalId!,
    deviationUrl,
    reason,
  });

  // Loop through the identified rejectors and send email
  for (const email of Array.from(rejectors)) {
    try {
      await mailer({ to: email, subject, html }); // Send email to the rejector
      logs.push({
        to: email,
        sentAt: new Date(),
        type: `reevaluation-${reason}`, // e.g., reevaluation-attachment
      });
    } catch (e) {
      console.error(`Failed Re-evaluation mail (${reason}) to ${email}:`, e);
    }
  }

  return logs;
}

// --- End Notification Helper Functions ---

// NEW function to notify the deviation owner about an approval decision
async function sendApprovalDecisionNotificationToOwner(
  deviation: DeviationType,
  deviationId: ObjectId,
  decision: 'approved' | 'rejected',
  approverEmail: string,
  approverRole: string, // The role under which the decision was made
  deviationUrl: string,
  comment?: string, // Add comment parameter
): Promise<NotificationLogType | null> {
  if (!deviation.owner) {
    console.error(
      `Cannot send approval decision notification for [${deviation.internalId}]: Owner email is missing.`,
    );
    return null;
  }

  const { subject, html } = approvalDecisionNotification({
    internalId: deviation.internalId!,
    deviationUrl,
    decision,
    approverEmail,
    approverRole,
    comment,
  });

  try {
    await mailer({ to: deviation.owner, subject, html });
    return {
      to: deviation.owner,
      sentAt: new Date(),
      type: `owner-decision-${decision}`, // e.g., owner-decision-approved
    };
  } catch (e) {
    console.error(
      `Failed Approval Decision mail (${decision}) to owner ${deviation.owner}:`,
      e,
    );
    return null; // Return null on failure
  }
}

// NEW function to notify team leaders when deviation is approved
async function sendTeamLeaderNotificationForPrint(
  deviation: DeviationType,
  deviationId: ObjectId,
  usersColl: Collection,
  deviationUrl: string,
): Promise<NotificationLogType[]> {
  const logs: NotificationLogType[] = [];

  const targetRole = `team-leader-${deviation.area}`;
  const teamLeaders = (await usersColl
    .find({ roles: targetRole })
    .toArray()) as unknown as UserWithRoles[];

  const uniqueEmails = Array.from(
    new Set(teamLeaders.map((user) => user.email).filter(Boolean)),
  );

  if (uniqueEmails.length > 0) {
    const { subject, html } = printImplementationNotification({
      internalId: deviation.internalId!,
      deviationUrl,
      area: deviation.area || '',
    });

    for (const email of uniqueEmails) {
      try {
        await mailer({ to: email, subject, html });
        logs.push({
          to: email,
          sentAt: new Date(),
          type: 'team-leader-implementation',
        });
      } catch (e) {
        console.error(`Failed Team Leader implementation mail to ${email}:`, e);
      }
    }
  } else {
  }

  return logs;
}

export async function revalidateDeviations() {
  revalidateTag('deviations', { expire: 0 });
}

// Helper function to add 12 hours to a date
function addTwelveHours(
  date: Date | string | undefined | null,
): Date | undefined | null {
  if (!date) return date as null | undefined; // Explicit type cast for null/undefined
  const newDate = new Date(date);
  newDate.setHours(12, 0, 0, 0); // Set to noon (12:00:00.000)
  return newDate;
}

export async function updateCorrectiveAction(
  id: string,
  correctiveAction: AddCorrectiveActionType,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/deviations');
  }
  try {
    const collection = await dbc('deviations');
    const deviationObjectId = new ObjectId(id); // Use consistent naming
    let deviationToUpdate = (await collection.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null; // Cast to DeviationType

    if (!deviationToUpdate) {
      return { error: 'not found' };
    }

    // NEW: Prevent adding corrective actions if deviation is closed
    if (deviationToUpdate.status === 'closed') {
      return { error: 'deviation closed' };
    }

    // Authorization check can remain or be adjusted based on who can add actions
    // For now, assuming owner can add. Add more checks if needed.
    // if (session.user?.email !== deviationToUpdate.owner) {
    //   return { error: 'not authorized' };
    // }

    const newCorrectiveAction = {
      ...correctiveAction,
      // Add 12 hours to deadline date
      deadline: addTwelveHours(correctiveAction.deadline),
      created: {
        at: new Date(),
        by: session.user?.email,
      },
      status: {
        // Default status when created
        value: 'open',
        executedAt: null, // Not executed yet
        changed: {
          at: new Date(),
          by: session.user?.email,
        },
      },
      history: [], // Initialize history
    };

    const res = await collection.updateOne(
      { _id: deviationObjectId },
      {
        $push: {
          correctiveActions: newCorrectiveAction,
        },
      } as any,
    );

    if (res.modifiedCount > 0) {
      // Fetch the updated deviation *after* adding the action
      deviationToUpdate = (await collection.findOne({
        _id: deviationObjectId,
      })) as DeviationType | null;

      if (!deviationToUpdate) {
        // Should not happen, but handle defensively
        console.error(
          `Failed to fetch deviation [${id}] after adding corrective action.`,
        );
        revalidateTag('deviation', { expire: 0 }); // Still revalidate
        return { success: 'updated', warning: 'notification_failed' };
      }

      const deviationUrl = `${process.env.BASE_URL}/deviations/${id}`;
      const allNewLogs: NotificationLogType[] = [];

      // 1. Send assignment notification
      const assignmentLog = await sendCorrectiveActionAssignmentNotification(
        deviationObjectId,
        deviationToUpdate.internalId || `ID:${id}`,
        correctiveAction,
        correctiveAction.responsible,
        deviationUrl,
      );
      if (assignmentLog) {
        allNewLogs.push(assignmentLog);
      }

      // 2. Send re-evaluation notification to rejectors
      const reevaluationLogs = await sendRejectionReevaluationNotification(
        deviationToUpdate,
        deviationObjectId,
        'corrective_action',
        deviationUrl,
      );
      allNewLogs.push(...reevaluationLogs);

      // Add all new notification logs to the deviation if any were generated
      if (allNewLogs.length > 0) {
        await collection.updateOne(
          { _id: deviationObjectId },
          { $push: { notificationLogs: { $each: allNewLogs } } } as any,
        );
      }

      revalidateTag('deviation', { expire: 0 }); // Revalidate the specific deviation page
      return { success: 'updated' };
    } else {
      // Handle case where the update didn't modify (e.g., concurrent update)
      // Check if the action might already exist if needed
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error('updateCorrectiveAction server action error:', error); // Log the specific error
    return { error: 'updateCorrectiveAction server action error' };
  }
}

export async function redirectToDeviation(id: string, lang: string) {
  redirect(`/${lang}/deviations/${id}`);
}

export async function revalidateReasons() {
  revalidateTag('deviationReasons', { expire: 0 });
}

export async function approveDeviation(
  id: string,
  userRole: string,
  isApproved: boolean,
  comment?: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  const approvalFieldMap: { [key: string]: keyof DeviationType } = {
    'group-leader': 'groupLeaderApproval',
    'quality-manager': 'qualityManagerApproval',
    'production-manager': 'productionManagerApproval',
    'plant-manager': 'plantManagerApproval',
  };

  // If user is a plant-manager, they can approve as any role (but we'll check for vacancies)
  const isPlantManager = (session.user?.roles ?? []).includes('plant-manager');

  // If plant manager tries to approve as another role, check if that role exists in the system
  if (isPlantManager && userRole !== 'plant-manager') {
    const usersColl = await dbc('users');

    // Check if users with the target role exist
    const usersWithRole = await usersColl.countDocuments({ roles: userRole });

    // If users with this role exist, plant manager cannot approve as this role
    if (usersWithRole > 0) {
      return { error: 'vacancy_required' };
    }

    // If no users with this role exist, continue with approval as the vacant role
  } else if (!isPlantManager) {
    // If not a plant manager, apply standard permission checks
    // Check if user has permission to approve as the specified role
    const hasDirectRole = (session.user?.roles ?? []).includes(userRole);
    const isProductionManager = (session.user?.roles ?? []).includes(
      'production-manager',
    );

    // Role elevation rules
    const canElevateToRole = isProductionManager && userRole === 'group-leader';

    // If user doesn't have direct role or elevated permission, reject
    if (!hasDirectRole && !canElevateToRole) {
      return { error: 'unauthorized role' };
    }
  }

  const approvalField = approvalFieldMap[userRole];
  if (!approvalField) {
    return { error: 'invalid role' };
  }

  try {
    const coll = await dbc('deviations');
    const deviationObjectId = new ObjectId(id); // Use ObjectId
    const deviation = (await coll.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null; // Cast to DeviationType
    if (!deviation) {
      return { error: 'not found' };
    }

    // Remove the Plant Manager approval check to allow all roles to approve
    // even after Plant Manager approval

    // Cast the specific approval field to ApprovalType | undefined
    const currentApproval = deviation[approvalField] as
      | ApprovalType
      | undefined;

    // Add validation for approval/rejection rules similar to UI:
    // 1. Prevent approving if already approved
    if (isApproved && currentApproval?.approved === true) {
      return { error: 'already approved' };
    }

    // 2. Prevent rejecting if already rejected by the same role
    if (!isApproved && currentApproval?.approved === false) {
      return { error: 'already rejected' };
    }

    // Only prevent actions if the deviation is closed
    if (deviation.status === 'closed') {
      return { error: 'deviation closed' };
    }

    const newApprovalRecord: ApprovalType = {
      approved: isApproved,
      by: session.user?.email,
      at: new Date(),
    };

    // Add comment for both approval and rejection
    if (comment) {
      newApprovalRecord.reason = comment;
    }

    // Prepare history records
    let history: ApprovalHistoryType[] = [];

    // Add the current approval to history if it exists
    if (currentApproval) {
      // If there's already history, preserve it
      if (currentApproval.history && currentApproval.history.length > 0) {
        history = [...currentApproval.history];
      }

      // Add the current approval state as a history item (excluding its own history)
      const { history: _, ...currentApprovalWithoutHistory } = currentApproval;
      history.unshift(currentApprovalWithoutHistory as ApprovalHistoryType);
    }

    // Set the history to the approval record
    newApprovalRecord.history = history;

    const updateField: Partial<DeviationType> = {
      [approvalField]: newApprovalRecord,
    };

    // MODIFIED: Determine the new status
    if (!isApproved) {
      // Current action is a rejection
      // If plant manager has NOT already approved this deviation, then a rejection changes status to 'rejected'.
      if (!(deviation.plantManagerApproval?.approved === true)) {
        updateField.status = 'rejected';
      }
      // If plant manager HAD already approved, a rejection by another role does NOT change the status.
      // The status would remain as it was (likely 'approved').
    } else {
      // Current action is an approval
      if (userRole === 'plant-manager') {
        // NEW: If Plant Manager is approving, determine the status based on the time period
        const currentDate = new Date(); // Today's date
        currentDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

        // Ensure from and to dates exist and convert to Date objects if they're strings
        const fromDate = deviation.timePeriod?.from
          ? new Date(deviation.timePeriod.from)
          : null;

        const toDate = deviation.timePeriod?.to
          ? new Date(deviation.timePeriod.to)
          : null;

        if (fromDate) fromDate.setHours(0, 0, 0, 0); // Normalize to start of day
        if (toDate) toDate.setHours(23, 59, 59, 999); // Normalize to end of day

        // Determine status based on the date ranges
        if (!fromDate || !toDate) {
          // If dates are missing, default to 'approved'
          updateField.status = 'approved';
        } else if (currentDate < fromDate) {
          // Current date is before the time period
          updateField.status = 'approved';
        } else if (currentDate > toDate) {
          // Current date is after the time period
          updateField.status = 'closed';
        } else {
          // Current date is within the time period
          updateField.status = 'in progress';
        }
      }
      // If it's an approval by another role, the status does not change from its current state.
    }

    const update = await coll.updateOne(
      { _id: deviationObjectId }, // Use ObjectId
      {
        $set: updateField,
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    // --- Start Notification Logic ---
    // Fetch the updated deviation to ensure we have the latest state for notification content
    const updatedDeviation = (await coll.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null;

    if (updatedDeviation && session.user?.email) {
      const deviationUrl = `${process.env.BASE_URL}/deviations/${id}`;
      const decision: 'approved' | 'rejected' = isApproved
        ? 'approved'
        : 'rejected';

      // Send notification to the owner
      const ownerNotificationLog =
        await sendApprovalDecisionNotificationToOwner(
          updatedDeviation,
          deviationObjectId,
          decision,
          session.user.email, // Approver's email
          userRole, // Role used for approval
          deviationUrl,
          comment, // Pass the comment
        );

      // Add the log to the deviation if generated
      if (ownerNotificationLog) {
        await coll.updateOne(
          { _id: deviationObjectId },
          { $push: { notificationLogs: ownerNotificationLog } } as any,
        );
      }

      // NEW: If fully approved by plant manager, notify team leaders for implementation
      if (
        isApproved &&
        userRole === 'plant-manager' &&
        (updatedDeviation.status === 'approved' ||
          updatedDeviation.status === 'in progress')
      ) {
        // Get users collection for finding team leaders
        const usersColl = await dbc('users');
        const teamLeaderLogs = await sendTeamLeaderNotificationForPrint(
          updatedDeviation,
          deviationObjectId,
          usersColl,
          deviationUrl,
        );

        // Add team leader notification logs if any
        if (teamLeaderLogs.length > 0) {
          await coll.updateOne(
            { _id: deviationObjectId },
            { $push: { notificationLogs: { $each: teamLeaderLogs } } } as any,
          );
        }
      }

      // Check if current approval completes the condition for notifying Plant Manager
      // Only check if this is an approval (not a rejection) and the current role is not plant-manager
      if (isApproved && userRole !== 'plant-manager') {
        // Check if all three other roles (except plant-manager) have approved
        const allOtherRolesApproved = [
          'group-leader',
          'quality-manager',
          'production-manager',
        ].every((role) => {
          if (role === userRole) {
            // For the current role being approved, check the new state (which is approved)
            return true;
          }
          // For other roles, check if they were previously approved
          const fieldName = approvalFieldMap[role];
          return (
            (updatedDeviation[fieldName] as ApprovalType | undefined)
              ?.approved === true
          );
        });

        // If all other roles have approved, notify Plant Manager
        if (allOtherRolesApproved) {
          const usersColl = await dbc('users');
          const plantManagers = (await usersColl
            .find({ roles: 'plant-manager' })
            .toArray()) as unknown as UserWithRoles[];
          const uniqueEmails = Array.from(
            new Set(plantManagers.map((user) => user.email).filter(Boolean)),
          );

          if (uniqueEmails.length > 0) {
            const { subject, html } = plantManagerFinalApprovalNotification({
              internalId: updatedDeviation.internalId!,
              deviationUrl,
            });

            const plantManagerNotificationLogs: NotificationLogType[] = [];
            for (const email of uniqueEmails) {
              try {
                await mailer({ to: email, subject, html });
                plantManagerNotificationLogs.push({
                  to: email,
                  sentAt: new Date(),
                  type: 'all-approved-awaiting-plant-manager',
                });
              } catch (e) {
                console.error(
                  `Failed to send plant manager notification to ${email}:`,
                  e,
                );
              }
            }

            // Add plant manager notification logs if any
            if (plantManagerNotificationLogs.length > 0) {
              await coll.updateOne(
                { _id: deviationObjectId },
                {
                  $push: {
                    notificationLogs: { $each: plantManagerNotificationLogs },
                  },
                } as any,
              );
            }
          }
        }
      }
    } else {
      console.error(
        `Could not send owner notification for [${id}]: Updated deviation not found or session user email missing.`,
      );
    }
    // --- End Notification Logic ---

    revalidateDeviationsAndDeviation();
    return { success: isApproved ? 'approved' : 'rejected' };
  } catch (error) {
    console.error(error);
    return { error: 'approveDeviation server action error' };
  }
}

export async function changeCorrectiveActionStatus(
  id: string,
  index: number,
  status: correctiveActionType['status'],
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  try {
    const coll = await dbc('deviations');
    const deviation = await coll.findOne({ _id: new ObjectId(id) });
    if (!deviation) {
      return { error: 'not found' };
    }

    const correctiveActions = deviation.correctiveActions || [];
    if (index < 0 || index >= correctiveActions.length) {
      return { error: 'invalid index' };
    }

    const correctiveActionToUpdate = correctiveActions[index];
    const userEmail = session.user.email;
    const userRoles = session.user.roles || [];

    // Authorization Check:
    const isOwner = deviation.owner === userEmail;
    const isCreator = correctiveActionToUpdate.created.by === userEmail;
    const isResponsible = correctiveActionToUpdate.responsible === userEmail;
    const hasRequiredRole = userRoles.some((role: string) =>
      [
        'group-leader',
        'quality-manager',
        'production-manager',
        'plant-manager',
      ].includes(role),
    );

    if (!isOwner && !isCreator && !isResponsible && !hasRequiredRole) {
      return { error: 'unauthorized' }; // User doesn't have permission
    }

    // Remove the old owner-only check:
    // if (deviation.owner !== session.user?.email) {
    //   return { error: 'unauthorized' };
    // }

    const currentStatus = correctiveActionToUpdate.status;
    const history = correctiveActionToUpdate.history || [];

    history.unshift(currentStatus);

    const update = await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`correctiveActions.${index}.status`]: status,
          [`correctiveActions.${index}.history`]: history,
        },
      },
    );

    if (update.matchedCount === 0) {
      return { error: 'not updated' };
    }

    revalidateDeviationsAndDeviation();
    return { success: 'updated' };
  } catch (error) {
    console.error(error);
    return { error: 'changeCorrectiveActionStatus server action error' }; // Changed error message slightly for clarity
  }
}

export async function redirectToDeviations(lang: string) {
  redirect(`/${lang}/deviations`);
}

export async function revalidateDeviationsAndDeviation() {
  revalidateTag('deviation', { expire: 0 });
  revalidateTag('deviations', { expire: 0 });
}

export async function revalidateDeviation() {
  revalidateTag('deviation', { expire: 0 });
}

// Helper function to generate the next internal ID using atomic counter
async function generateNextInternalId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const shortYear = currentYear.toString().slice(-2);
  const nextNumber = await getNextSequenceValue('deviations', currentYear);
  return `${nextNumber}/${shortYear}`;
}

// Update insertDeviation to include internalId and email notification logging
export async function insertDeviation(deviation: AddDeviationType) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/deviations');
  }
  try {
    const collection = await dbc('deviations');
    const internalId = await generateNextInternalId();

    const deviationToInsert: DeviationType = {
      internalId,
      status: 'in approval',
      articleName: deviation.articleName,
      articleNumber: deviation.articleNumber,
      ...(deviation.workplace && { workplace: deviation.workplace }),
      ...(deviation.quantity && {
        quantity: {
          value: Number(deviation.quantity),
          unit: deviation.unit && deviation.unit,
        },
      }),
      ...(deviation.charge && { charge: deviation.charge }),
      reason: deviation.reason,
      timePeriod: {
        from: addTwelveHours(deviation.periodFrom),
        to: addTwelveHours(deviation.periodTo),
      },
      ...(deviation.area && { area: deviation.area }),
      ...(deviation.description && { description: deviation.description }),
      ...(deviation.processSpecification && {
        processSpecification: deviation.processSpecification,
      }),
      createdAt: new Date(),
      ...(deviation.customerNumber && {
        customerNumber: deviation.customerNumber,
      }),
      customerAuthorization: deviation.customerAuthorization,
      owner: session.user?.email,
      correctiveActions: [],
      notificationLogs: [], // Initialize notificationLogs
    };

    const res = await collection.insertOne(deviationToInsert);
    if (res.insertedId) {
      revalidateTag('deviations', { expire: 0 });

      // Call the centralized notification handler for creation
      await handleNotifications(deviationToInsert, res.insertedId, 'creation'); // Pass 'creation' context

      return { success: 'inserted', insertedId: res.insertedId.toString() };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertDeviation server action error' };
  }
}

export async function insertDraftDeviation(deviation: AddDeviationDraftType) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/deviations');
  }

  try {
    const collection = await dbc('deviations');

    const deviationDraftToInsert: DeviationType = {
      status: 'draft',
      ...(deviation.articleName && { articleName: deviation.articleName }),
      ...(deviation.articleNumber && {
        articleNumber: deviation.articleNumber,
      }),
      ...(deviation.workplace && { workplace: deviation.workplace }),

      ...(deviation.quantity && {
        quantity: {
          value: Number(deviation.quantity),
          unit: deviation.unit && deviation.unit,
        },
      }),
      ...(deviation.unit && { unit: deviation.unit }),
      ...(deviation.charge && { charge: deviation.charge }),
      ...(deviation.reason && { reason: deviation.reason }),
      timePeriod: {
        from: addTwelveHours(deviation.periodFrom),
        to: addTwelveHours(deviation.periodTo),
      },
      ...(deviation.area && { area: deviation.area }),
      ...(deviation.description && { description: deviation.description }),
      ...(deviation.processSpecification && {
        processSpecification: deviation.processSpecification,
      }),
      createdAt: new Date(),
      ...(deviation.customerNumber && {
        customerNumber: deviation.customerNumber,
      }),
      customerAuthorization: deviation.customerAuthorization,
      owner: session.user?.email,
      correctiveActions: [],
    };

    const res = await collection.insertOne(deviationDraftToInsert);
    if (res) {
      // revalidateTag('deviations');
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertDraftDeviation server action error' };
  }
}

export async function findArticleName(articleNumber: string) {
  try {
    const collection = await dbc('inventory_articles');
    const res = await collection.findOne({ number: articleNumber });
    if (res) {
      return { success: res.name };
    } else {
      return { error: 'not found' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'findArticleName server action error' };
  }
}

export async function deleteDraftDeviation(id: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/deviations');
  }
  try {
    const collection = await dbc('deviations');
    const res = await collection.deleteOne({
      _id: new ObjectId(id),
      owner: session.user?.email,
      status: 'draft',
    });
    if (res) {
      revalidateTag('deviations', { expire: 0 });
      return { success: 'deleted' };
    } else {
      return { error: 'not deleted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'deleteDraftDeviation server action error' };
  }
}

export async function updateDraftDeviation(
  id: string,
  deviation: AddDeviationDraftType,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  try {
    const collection = await dbc('deviations');
    const deviationToUpdate = await collection.findOne({
      _id: new ObjectId(id),
      owner: session.user?.email,
      status: 'draft',
    });

    if (!deviationToUpdate) {
      return { error: 'not found' };
    }

    const updateData: Partial<DeviationType> = {
      status: 'draft',
      // REMOVED: edited field
      // edited: {
      //   at: new Date(),
      //   by: session.user?.email,
      // },
      ...(deviation.articleName !== undefined && {
        articleName: deviation.articleName,
      }),
      ...(deviation.articleNumber !== undefined && {
        articleNumber: deviation.articleNumber,
      }),
      ...(deviation.customerNumber !== undefined && {
        customerNumber: deviation.customerNumber,
      }),
      ...(deviation.customerName !== undefined && {
        customerName: deviation.customerName,
      }),
      ...(deviation.workplace !== undefined && {
        workplace: deviation.workplace,
      }),
      quantity:
        deviation.quantity !== undefined
          ? {
              value: Number(deviation.quantity),
              unit: deviation.unit || deviationToUpdate.quantity?.unit || 'pcs',
            }
          : deviationToUpdate.quantity,
      ...(deviation.charge !== undefined && { charge: deviation.charge }),
      ...(deviation.description !== undefined && {
        description: deviation.description,
      }),
      ...(deviation.reason !== undefined && { reason: deviation.reason }),
      timePeriod: {
        from: addTwelveHours(deviation.periodFrom),
        to: addTwelveHours(deviation.periodTo),
      },
      ...(deviation.area !== undefined && { area: deviation.area }),
      ...(deviation.processSpecification !== undefined && {
        processSpecification: deviation.processSpecification,
      }),
      customerAuthorization: deviation.customerAuthorization,
    };

    const res = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (res.matchedCount === 0) {
      return { error: 'not found during update' };
    }
    if (res.modifiedCount === 0) {
    }

    revalidateDeviationsAndDeviation();
    return { success: 'updated' };
  } catch (error) {
    console.error('updateDraftDeviation server action error:', error);
    return { error: 'updateDraftDeviation server action error' };
  }
}

// RENAMED function to compare fields and generate log entries
function generateEditLogs(
  original: DeviationType,
  updated: AddDeviationType, // Use the Zod type for incoming data
  userEmail: string,
): EditLogEntryType[] {
  // RENAMED: return type
  const logs: EditLogEntryType[] = []; // RENAMED: type
  const now = new Date();

  // Helper function to format dates consistently for comparison
  const formatDateForComparison = (
    date: Date | string | null | undefined,
  ): string | null => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Helper function to create a date at noon in the local timezone
  // This ensures the stored date in logs matches what's stored in the database
  const normalizeDate = (
    date: Date | string | null | undefined,
  ): Date | null => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // Set to noon (12:00:00.000)
    return d;
  };

  const fieldsToCompare: (keyof AddDeviationType)[] = [
    'articleNumber',
    'articleName',
    'workplace',
    'customerNumber',
    'customerName',
    'quantity', // Compare quantity value
    'unit', // Compare quantity unit
    'charge',
    'reason',
    'periodFrom', // Compare timePeriod.from
    'periodTo', // Compare timePeriod.to
    'area',
    'description',
    'processSpecification',
    'customerAuthorization',
  ];

  fieldsToCompare.forEach((key) => {
    let originalValue: any;
    let updatedValue: any;
    let shouldAddLog = true; // Flag to determine if we should add this change to logs

    // Handle nested fields or transformations
    if (key === 'quantity') {
      originalValue = original.quantity?.value;
      updatedValue = updated.quantity ? Number(updated.quantity) : undefined;
    } else if (key === 'unit') {
      originalValue = original.quantity?.unit;
      updatedValue = updated.unit;
    } else if (key === 'periodFrom') {
      // Get normalized versions of dates for comparison
      const originalNormalized = normalizeDate(original.timePeriod?.from);
      const updatedNormalized = normalizeDate(updated.periodFrom);

      // Get string versions for comparison
      const originalComp = formatDateForComparison(originalNormalized);
      const updatedComp = formatDateForComparison(updatedNormalized);

      // Store the normalized dates in the logs to ensure consistency
      originalValue = originalNormalized;
      updatedValue = updatedNormalized;

      // Don't add to logs if dates are the same after normalization
      if (originalComp === updatedComp) {
        shouldAddLog = false;
      }
    } else if (key === 'periodTo') {
      // Get normalized versions of dates for comparison
      const originalNormalized = normalizeDate(original.timePeriod?.to);
      const updatedNormalized = normalizeDate(updated.periodTo);

      // Get string versions for comparison
      const originalComp = formatDateForComparison(originalNormalized);
      const updatedComp = formatDateForComparison(updatedNormalized);

      // Store the normalized dates in the logs to ensure consistency
      originalValue = originalNormalized;
      updatedValue = updatedNormalized;

      // Don't add to logs if dates are the same after normalization
      if (originalComp === updatedComp) {
        shouldAddLog = false;
      }
    } else {
      originalValue = original[key as keyof DeviationType];
      updatedValue = updated[key];
    }

    // For all fields except dates which have their own comparison logic above
    if (key !== 'periodFrom' && key !== 'periodTo') {
      // Ensure consistent comparison (e.g., treat undefined/null/empty string similarly if needed)
      const originalComp = originalValue ?? null;
      const updatedComp = updatedValue ?? null;

      // Only add to logs if values are different
      if (JSON.stringify(originalComp) === JSON.stringify(updatedComp)) {
        shouldAddLog = false;
      }
    }

    // Add to logs if we determined there was a change
    if (shouldAddLog) {
      logs.push({
        changedAt: now,
        changedBy: userEmail,
        fieldName: key, // Use the key from AddDeviationType
        oldValue: originalValue, // Store normalized representation
        newValue: updatedValue, // Store normalized representation
      });
    }
  });

  return logs;
}

// NEW function to update non-draft deviations
export async function updateDeviation(
  id: string,
  deviation: AddDeviationType, // Assuming payload is similar to creation
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }
  try {
    const collection = await dbc('deviations');
    const deviationObjectId = new ObjectId(id);
    const originalDeviation = (await collection.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null; // Cast to DeviationType

    if (!originalDeviation) {
      return { error: 'not found' };
    }

    // Ensure it's not a draft
    if (originalDeviation.status === 'draft') {
      return { error: 'cannot update draft using this function' };
    }

    // Authorization check (e.g., only owner can edit)
    if (session.user?.email !== originalDeviation.owner) {
      // Add more complex role checks if needed (e.g., admin, plant manager)
      return { error: 'not authorized' };
    }

    // Generate edit logs BEFORE preparing the update data
    const newLogEntries = generateEditLogs(
      // RENAMED: function call and variable
      originalDeviation,
      deviation,
      session.user.email,
    );

    // Check if any changes were actually made
    if (newLogEntries.length === 0) {
      return { error: 'no changes' };
    }

    const existingLogs = originalDeviation.editLogs || []; // RENAMED: field and variable
    const combinedLogs = [...existingLogs, ...newLogEntries]; // RENAMED: variable

    // Prepare update data using atomic operators
    const updateOperation: { $set: Partial<DeviationType>; $unset?: any } = {
      $set: {
        // Update fields from the payload
        articleName: deviation.articleName,
        articleNumber: deviation.articleNumber,
        workplace: deviation.workplace || undefined, // Ensure undefined if empty
        quantity:
          deviation.quantity !== undefined && deviation.quantity !== undefined
            ? {
                value: Number(deviation.quantity),
                unit: deviation.unit || originalDeviation.quantity?.unit, // Keep original unit if new one not provided
              }
            : undefined, // Set quantity to undefined if not provided
        charge: deviation.charge || undefined,
        reason: deviation.reason,
        timePeriod: {
          from: addTwelveHours(deviation.periodFrom),
          to: addTwelveHours(deviation.periodTo),
        },
        area: deviation.area || undefined,
        description: deviation.description || undefined,
        processSpecification: deviation.processSpecification || undefined,
        customerNumber: deviation.customerNumber || undefined,
        customerName: deviation.customerName || undefined, // Add customerName update
        customerAuthorization: deviation.customerAuthorization,
        // REMOVED: edited field
        // edited: {
        //   at: new Date(),
        //   by: session.user?.email,
        // },
        // Reset status
        status: 'in approval',
        // Add the combined edit logs
        editLogs: combinedLogs, // RENAMED: field and variable
      },
      // Use $unset to remove approval fields entirely, ensuring they are re-evaluated
      $unset: {
        groupLeaderApproval: '',
        qualityManagerApproval: '',
        productionManagerApproval: '',
        plantManagerApproval: '',
      },
    };

    // Remove fields from $set if they are explicitly null/undefined in the payload
    // to avoid overwriting existing data with null unless intended.
    // (Adjust logic based on whether empty strings/nulls should clear fields)
    if (deviation.workplace === undefined || deviation.workplace === null)
      delete updateOperation.$set.workplace;
    if (deviation.charge === undefined || deviation.charge === null)
      delete updateOperation.$set.charge;
    if (deviation.area === undefined || deviation.area === null)
      delete updateOperation.$set.area;
    if (deviation.description === undefined || deviation.description === null)
      delete updateOperation.$set.description;
    if (
      deviation.processSpecification === undefined ||
      deviation.processSpecification === null
    )
      delete updateOperation.$set.processSpecification;
    if (
      deviation.customerNumber === undefined ||
      deviation.customerNumber === null
    )
      delete updateOperation.$set.customerNumber;
    if (deviation.customerName === undefined || deviation.customerName === null)
      delete updateOperation.$set.customerName;
    if (deviation.quantity === undefined || deviation.quantity === null)
      delete updateOperation.$set.quantity; // Remove quantity if not provided

    // Perform the update
    const res = await collection.updateOne(
      { _id: deviationObjectId },
      updateOperation, // Use the correctly structured update operation
    );

    if (res.matchedCount === 0) {
      return { error: 'not found during update' };
    }

    // Fetch the updated deviation to pass to notifications
    const updatedDeviation = await collection.findOne({
      _id: deviationObjectId,
    });

    if (updatedDeviation) {
      // Trigger notifications for the edit
      await handleNotifications(
        updatedDeviation as DeviationType,
        deviationObjectId,
        'edit',
      ); // Pass 'edit' context
    }

    revalidateDeviationsAndDeviation();
    return { success: 'updated' };
  } catch (error) {
    console.error('updateDeviation server action error:', error);
    return { error: 'updateDeviation server action error' };
  }
}

export async function insertDeviationFromDraft(
  id: string,
  deviation: AddDeviationType,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/deviations');
  }
  try {
    const collection = await dbc('deviations');
    const draftDeviation = await collection.findOne({ _id: new ObjectId(id) });

    if (!draftDeviation) return { error: 'draft not found' };
    if (session.user?.email !== draftDeviation.owner)
      return { error: 'not authorized' };
    if (draftDeviation.status !== 'draft')
      return { error: 'source is not a draft' };

    const internalId = await generateNextInternalId();
    const deviationToInsert: DeviationType = {
      internalId,
      status: 'in approval',
      articleName: deviation.articleName,
      articleNumber: deviation.articleNumber,
      ...(deviation.workplace && { workplace: deviation.workplace }),
      ...(deviation.quantity && {
        quantity: {
          value: Number(deviation.quantity),
          unit: deviation.unit && deviation.unit,
        },
      }),
      ...(deviation.charge && { charge: deviation.charge }),
      reason: deviation.reason,
      timePeriod: {
        from: addTwelveHours(deviation.periodFrom),
        to: addTwelveHours(deviation.periodTo),
      },
      ...(deviation.area && { area: deviation.area }),
      ...(deviation.description && { description: deviation.description }),
      ...(deviation.processSpecification && {
        processSpecification: deviation.processSpecification,
      }),
      createdAt: new Date(), // Use new creation date
      ...(deviation.customerNumber && {
        customerNumber: deviation.customerNumber,
      }),
      customerAuthorization: deviation.customerAuthorization,
      owner: session.user?.email,
      correctiveActions: [], // Start with empty corrective actions
      notificationLogs: [], // Initialize notificationLogs
    };

    const insertRes = await collection.insertOne(deviationToInsert);
    if (!insertRes.insertedId) {
      return { error: 'failed to insert new deviation' };
    }

    // Delete the original draft
    await collection.deleteOne({ _id: new ObjectId(id) });

    revalidateDeviationsAndDeviation();
    return { success: 'inserted', insertedId: insertRes.insertedId.toString() };
  } catch (error) {
    console.error(error);
    return { error: 'insertDeviationFromDraft server action error' };
  }
}

// NEW Server Action to handle notifications after attachment upload
export async function notifyRejectorsAfterAttachment(deviationId: string) {
  // No session check needed here if called internally by trusted backend code (API route)
  // If called directly from client, add session/auth checks.
  try {
    const collection = await dbc('deviations');
    const deviationObjectId = new ObjectId(deviationId);
    const deviation = (await collection.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null;

    if (!deviation) {
      console.error(
        `notifyRejectorsAfterAttachment: Deviation not found [${deviationId}]`,
      );
      return { error: 'not found' };
    }

    // Prevent notifications if deviation is closed
    if (deviation.status === 'closed') {
      return { success: 'skipped_closed' };
    }

    const deviationUrl = `${process.env.BASE_URL}/deviations/${deviationId}`;

    // Send re-evaluation notification to rejectors
    const reevaluationLogs = await sendRejectionReevaluationNotification(
      deviation,
      deviationObjectId,
      'attachment', // Specify reason
      deviationUrl,
    );

    // Add the notification logs to the deviation if any were generated
    if (reevaluationLogs.length > 0) {
      await collection.updateOne(
        { _id: deviationObjectId },
        { $push: { notificationLogs: { $each: reevaluationLogs } } } as any,
      );
    }

    revalidateTag('deviation', { expire: 0 }); // Revalidate the specific deviation page
    return { success: 'notified' };
  } catch (error) {
    console.error('notifyRejectorsAfterAttachment server action error:', error);
    return { error: 'notifyRejectorsAfterAttachment server action error' };
  }
}

export async function addNote(deviationId: string, content: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  try {
    const collection = await dbc('deviations');
    const deviationObjectId = new ObjectId(deviationId);

    // Check if deviation exists
    const deviation = await collection.findOne({ _id: deviationObjectId });
    if (!deviation) {
      return { error: 'not found' };
    }

    // Create new note
    const newNote: NoteType = {
      content,
      createdBy: session.user.email,
      createdAt: new Date(),
    };

    // Add note to deviation
    const result = await collection.updateOne(
      { _id: deviationObjectId },
      { $push: { notes: newNote } } as any,
    );

    if (result.modifiedCount === 0) {
      return { error: 'not updated' };
    }

    revalidateTag('deviation', { expire: 0 });
    return { success: 'added' };
  } catch (error) {
    console.error('addNote server action error:', error);
    return { error: 'addNote server action error' };
  }
}

export async function cancelDeviation(deviationId: string, reason?: string) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return { error: 'unauthorized' };
  }

  try {
    const collection = await dbc('deviations');
    const deviationObjectId = new ObjectId(deviationId);

    const deviation = (await collection.findOne({
      _id: deviationObjectId,
    })) as DeviationType | null;

    if (!deviation) {
      return { error: 'not found' };
    }

    // Block cancellation for closed, cancelled, or rejected deviations
    if (['closed', 'cancelled', 'rejected'].includes(deviation.status)) {
      return { error: 'cannot cancel' };
    }

    const userEmail = session.user.email;
    const userRoles = session.user.roles || [];

    // Authorization check
    const isOwner = deviation.owner === userEmail;
    const isMatchingGroupLeader =
      userRoles.includes('group-leader') &&
      deviation.area &&
      userRoles.includes(`group-leader-${deviation.area}`);
    const isAdmin = userRoles.includes('admin');
    const isPlantManager = userRoles.includes('plant-manager');

    if (!isOwner && !isMatchingGroupLeader && !isAdmin && !isPlantManager) {
      return { error: 'not authorized' };
    }

    // Create cancellation info
    const cancellation: CancellationType = {
      by: userEmail,
      at: new Date(),
      ...(reason && { reason }),
    };

    // Update deviation
    const result = await collection.updateOne(
      { _id: deviationObjectId },
      {
        $set: {
          status: 'cancelled',
          cancellation,
        },
      },
    );

    if (result.modifiedCount === 0) {
      return { error: 'not updated' };
    }

    revalidateDeviationsAndDeviation();
    return { success: 'cancelled' };
  } catch (error) {
    console.error('cancelDeviation server action error:', error);
    return { error: 'cancelDeviation server action error' };
  }
}
