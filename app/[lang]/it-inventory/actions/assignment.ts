'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { AssignEmployeeType, UnassignEmployeeType } from '../lib/zod';
import getEmployees from '@/lib/data/get-employees';
import { EmployeeType } from '@/lib/types/employee-types';

export async function assignEmployee(
  itemId: string,
  data: AssignEmployeeType,
): Promise<{ success: 'assigned' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/it-inventory');
  }

  try {
    // Only admin role can assign
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasAdminRole) {
      return { error: 'Unauthorized - only admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    // Get item
    const item = await coll.findOne({ _id: new ObjectId(itemId) });
    if (!item) {
      return { error: 'Item not found' };
    }

    // Create assignment target based on type
    let assignmentTarget;

    if (data.assignmentType === 'employee') {
      // Get employee by identifier
      const employees = await getEmployees();
      const employee = employees.find(
        (emp) => emp.identifier === data.employeeIdentifier,
      );

      if (!employee) {
        return { error: 'Employee not found' };
      }

      assignmentTarget = {
        type: 'employee' as const,
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          identifier: employee.identifier,
          pin: employee.pin,
        },
      };
    } else {
      // Custom assignment
      if (!data.customName) {
        return { error: 'Custom name is required' };
      }

      assignmentTarget = {
        type: 'custom' as const,
        customName: data.customName,
      };
    }

    // If item already has an assignment, move it to history first
    const assignmentHistory = item.assignmentHistory || [];
    if (item.currentAssignment) {
      assignmentHistory.push({
        ...item.currentAssignment,
        unassignedAt: new Date(),
        unassignedBy: session.user.email,
        reason: data.reason || 'Reassigned',
      });
    }

    // Create new assignment
    const currentAssignment = {
      assignment: assignmentTarget,
      assignedAt: data.assignedAt || new Date(),
      assignedBy: session.user.email,
    };

    // Prepare new statuses - remove 'in-stock' and add 'in-use'
    let currentStatuses = item.statuses || [];
    // Remove 'in-stock' if present
    currentStatuses = currentStatuses.filter((status: string) => status !== 'in-stock');
    // Add 'in-use' if not already present
    if (!currentStatuses.includes('in-use')) {
      currentStatuses.push('in-use');
    }

    // Update item
    const res = await coll.updateOne(
      { _id: new ObjectId(itemId) },
      {
        $set: {
          currentAssignment,
          assignmentHistory,
          statuses: currentStatuses,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      },
    );

    if (res.modifiedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      revalidateTag('it-inventory-item', { expire: 0 });
      return { success: 'assigned' };
    } else {
      return { error: 'not assigned' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'assignEmployee server action error' };
  }
}

export async function unassignEmployee(
  itemId: string,
  data: UnassignEmployeeType,
): Promise<{ success: 'unassigned' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/it-inventory');
  }

  try {
    // Only admin role can unassign
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasAdminRole) {
      return { error: 'Unauthorized - only admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    // Get item
    const item = await coll.findOne({ _id: new ObjectId(itemId) });
    if (!item) {
      return { error: 'Item not found' };
    }

    if (!item.currentAssignment) {
      return { error: 'Item is not assigned to anyone' };
    }

    // Move current assignment to history
    const assignmentHistory = item.assignmentHistory || [];
    assignmentHistory.push({
      ...item.currentAssignment,
      unassignedAt: new Date(),
      unassignedBy: session.user.email,
      reason: data.reason || undefined,
    });

    // Prepare new statuses - remove 'in-use' and set user-selected statuses
    let newStatuses = data.statuses || ['in-stock'];
    // Ensure 'in-use' is not in the new statuses
    newStatuses = newStatuses.filter((status) => status !== 'in-use');

    // Update item
    const res = await coll.updateOne(
      { _id: new ObjectId(itemId) },
      {
        $set: {
          assignmentHistory,
          statuses: newStatuses,
          editedAt: new Date(),
          editedBy: session.user.email,
        },
        $unset: {
          currentAssignment: '',
        },
      },
    );

    if (res.modifiedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      revalidateTag('it-inventory-item', { expire: 0 });
      return { success: 'unassigned' };
    } else {
      return { error: 'not unassigned' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'unassignEmployee server action error' };
  }
}

export async function bulkUpdateStatuses(
  itemIds: string[],
  statusesToAdd: string[],
  statusesToRemove: string[],
): Promise<
  | { success: 'updated'; count: number; skipped?: number }
  | { error: string }
> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/it-inventory');
  }

  try {
    // Only admin role can bulk update
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasAdminRole) {
      return { error: 'Unauthorized - only admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');
    const objectIds = itemIds.map((id) => new ObjectId(id));

    // For each item, get current statuses and update them
    let updatedCount = 0;
    let skippedCount = 0;

    for (const itemId of objectIds) {
      const item = await coll.findOne({ _id: itemId });
      if (!item) continue;

      // Skip if trying to add 'in-stock' to an assigned item
      if (
        item.currentAssignment &&
        statusesToAdd.includes('in-stock')
      ) {
        skippedCount++;
        continue;
      }

      let newStatuses = [...item.statuses];

      // Add new statuses
      for (const status of statusesToAdd) {
        if (!newStatuses.includes(status)) {
          newStatuses.push(status);
        }
      }

      // Remove statuses
      newStatuses = newStatuses.filter(
        (status) => !statusesToRemove.includes(status),
      );

      // Ensure at least one status remains
      if (newStatuses.length === 0) {
        continue; // Skip this item if it would have no statuses
      }

      // Update item
      const res = await coll.updateOne(
        { _id: itemId },
        {
          $set: {
            statuses: newStatuses,
            editedAt: new Date(),
            editedBy: session.user.email,
          },
        },
      );

      if (res.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      return {
        success: 'updated',
        count: updatedCount,
        skipped: skippedCount > 0 ? skippedCount : undefined,
      };
    } else {
      return { error: 'no items updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'bulkUpdateStatuses server action error' };
  }
}
