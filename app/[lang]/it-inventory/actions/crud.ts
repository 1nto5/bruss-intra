'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { NewItemType, EditItemType } from '../lib/zod';
import { ITInventoryItem, ASSET_ID_PREFIXES } from '../lib/types';
import { revalidateInventory, revalidateInventoryItem } from './utils';

export async function insertItem(
  data: NewItemType,
): Promise<{ success: 'inserted'; assetId?: string } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    // Only IT or Admin role can manage inventory
    const hasITRole = session.user.roles?.includes('it');
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasITRole && !hasAdminRole) {
      return { error: 'Unauthorized - only IT/Admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    let assetId: string;

    // Auto-generate ID for monitors, manual for others
    if (data.category === 'monitor') {
      // Find highest monitor ID and increment
      const monitors = await coll
        .find({ category: 'monitor' })
        .sort({ assetId: -1 })
        .limit(100)
        .toArray();

      let maxNumber = 0;
      for (const monitor of monitors) {
        const num = parseInt(monitor.assetId);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }

      assetId = String(maxNumber + 1).padStart(3, '0');
    } else {
      // Manual asset ID - user provides number, prefix from category
      const prefix = ASSET_ID_PREFIXES[data.category];
      assetId = `${prefix}${data.assetNumber}`;

      // Check for duplicates
      const existing = await coll.findOne({ assetId });
      if (existing) {
        return { error: 'Asset ID already exists' };
      }
    }

    // Create item document
    const itemToInsert = {
      assetId,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      statuses: data.statuses,
      connectionType: data.connectionType,
      ipAddress: data.ipAddress,
      lastReview: data.lastReview,
      notes: data.notes,
      department: data.department,
      assignmentHistory: [],
      createdAt: new Date(),
      createdBy: session.user.email,
      editedAt: new Date(),
      editedBy: session.user.email,
    };

    const res = await coll.insertOne(itemToInsert);
    if (res) {
      revalidateTag('it-inventory', { expire: 0 });
      return { success: 'inserted', assetId };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertItem server action error' };
  }
}

export async function getItem(id: string): Promise<ITInventoryItem | null> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    const coll = await dbc('it_inventory');
    const item = await coll.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return null;
    }

    // Serialize employee _id in assignments
    const currentAssignment = item.currentAssignment
      ? (() => {
          // Handle both old (employee directly) and new (assignment.type) structures
          const assignment = item.currentAssignment.assignment
            ? (item.currentAssignment.assignment.type === 'employee'
                ? {
                    type: 'employee' as const,
                    employee: {
                      ...item.currentAssignment.assignment.employee,
                      _id: item.currentAssignment.assignment.employee._id?.toString(),
                    },
                  }
                : item.currentAssignment.assignment)
            : (item.currentAssignment.employee
                ? {
                    type: 'employee' as const,
                    employee: {
                      ...item.currentAssignment.employee,
                      _id: item.currentAssignment.employee._id?.toString(),
                    },
                  }
                : undefined);

          // Exclude old 'employee' field to avoid ObjectId serialization issues
          const { employee, ...restAssignment } = item.currentAssignment;
          return {
            ...restAssignment,
            assignment,
          };
        })()
      : undefined;

    const assignmentHistory = (item.assignmentHistory || []).map((record: any) => {
      // Handle both old (employee directly) and new (assignment.type) structures
      const assignment = record.assignment
        ? (record.assignment.type === 'employee'
            ? {
                type: 'employee' as const,
                employee: {
                  ...record.assignment.employee,
                  _id: record.assignment.employee._id?.toString(),
                },
              }
            : record.assignment)
        : (record.employee
            ? {
                type: 'employee' as const,
                employee: {
                  ...record.employee,
                  _id: record.employee._id?.toString(),
                },
              }
            : undefined);

      // Exclude old 'employee' field to avoid ObjectId serialization issues
      const { employee, ...restRecord } = record;
      return {
        ...restRecord,
        assignment,
      };
    });

    return {
      _id: item._id.toString(),
      assetId: item.assetId,
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      purchaseDate: item.purchaseDate,
      statuses: item.statuses,
      connectionType: item.connectionType,
      ipAddress: item.ipAddress,
      lastReview: item.lastReview,
      notes: item.notes || '',
      department: item.department || '',
      currentAssignment,
      assignmentHistory,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      editedAt: item.editedAt,
      editedBy: item.editedBy,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getItemForEdit(
  id: string,
): Promise<ITInventoryItem | null> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    // Only IT or Admin role can edit
    const hasITRole = session.user.roles?.includes('it');
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasITRole && !hasAdminRole) {
      return null;
    }

    const coll = await dbc('it_inventory');
    const item = await coll.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return null;
    }

    // Serialize employee _id in assignments
    const currentAssignment = item.currentAssignment
      ? (() => {
          // Handle both old (employee directly) and new (assignment.type) structures
          const assignment = item.currentAssignment.assignment
            ? (item.currentAssignment.assignment.type === 'employee'
                ? {
                    type: 'employee' as const,
                    employee: {
                      ...item.currentAssignment.assignment.employee,
                      _id: item.currentAssignment.assignment.employee._id?.toString(),
                    },
                  }
                : item.currentAssignment.assignment)
            : (item.currentAssignment.employee
                ? {
                    type: 'employee' as const,
                    employee: {
                      ...item.currentAssignment.employee,
                      _id: item.currentAssignment.employee._id?.toString(),
                    },
                  }
                : undefined);

          // Exclude old 'employee' field to avoid ObjectId serialization issues
          const { employee, ...restAssignment } = item.currentAssignment;
          return {
            ...restAssignment,
            assignment,
          };
        })()
      : undefined;

    const assignmentHistory = (item.assignmentHistory || []).map((record: any) => {
      // Handle both old (employee directly) and new (assignment.type) structures
      const assignment = record.assignment
        ? (record.assignment.type === 'employee'
            ? {
                type: 'employee' as const,
                employee: {
                  ...record.assignment.employee,
                  _id: record.assignment.employee._id?.toString(),
                },
              }
            : record.assignment)
        : (record.employee
            ? {
                type: 'employee' as const,
                employee: {
                  ...record.employee,
                  _id: record.employee._id?.toString(),
                },
              }
            : undefined);

      // Exclude old 'employee' field to avoid ObjectId serialization issues
      const { employee, ...restRecord } = record;
      return {
        ...restRecord,
        assignment,
      };
    });

    return {
      _id: item._id.toString(),
      assetId: item.assetId,
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      purchaseDate: item.purchaseDate,
      statuses: item.statuses,
      connectionType: item.connectionType,
      ipAddress: item.ipAddress,
      lastReview: item.lastReview,
      notes: item.notes || '',
      department: item.department || '',
      currentAssignment,
      assignmentHistory,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      editedAt: item.editedAt,
      editedBy: item.editedBy,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateItem(
  id: string,
  data: EditItemType,
): Promise<{ success: 'updated' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    // Only IT or Admin role can update
    const hasITRole = session.user.roles?.includes('it');
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasITRole && !hasAdminRole) {
      return { error: 'Unauthorized - only IT/Admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    // Check if item exists
    const existingItem = await coll.findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return { error: 'Item not found' };
    }

    // Handle assetNumber change (only for non-monitors)
    let newAssetId = existingItem.assetId;
    if (data.assetNumber && existingItem.category !== 'monitor') {
      const prefix = ASSET_ID_PREFIXES[existingItem.category as keyof typeof ASSET_ID_PREFIXES];
      newAssetId = `${prefix}${data.assetNumber}`;

      // Check for duplicates (exclude current item)
      if (newAssetId !== existingItem.assetId) {
        const duplicate = await coll.findOne({ assetId: newAssetId });
        if (duplicate) {
          return { error: 'Asset ID already exists' };
        }
      }
    }

    // Update item
    const updateData: Record<string, any> = {
      assetId: newAssetId,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      statuses: data.statuses,
      connectionType: data.connectionType,
      ipAddress: data.ipAddress,
      lastReview: data.lastReview,
      notes: data.notes,
      department: data.department,
      editedAt: new Date(),
      editedBy: session.user.email,
    };

    const res = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (res.modifiedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      revalidateTag('it-inventory-item', { expire: 0 });
      return { success: 'updated' };
    } else {
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'updateItem server action error' };
  }
}

export async function deleteItem(
  id: string,
): Promise<{ success: 'deleted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    // Only IT or Admin role can delete
    const hasITRole = session.user.roles?.includes('it');
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasITRole && !hasAdminRole) {
      return { error: 'Unauthorized - only IT/Admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    const res = await coll.deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      return { success: 'deleted' };
    } else {
      return { error: 'not deleted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'deleteItem server action error' };
  }
}

export async function bulkDeleteItems(
  ids: string[],
): Promise<{ success: 'deleted'; count: number } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth');
  }

  try {
    // Only IT or Admin role can delete
    const hasITRole = session.user.roles?.includes('it');
    const hasAdminRole = session.user.roles?.includes('admin');
    if (!hasITRole && !hasAdminRole) {
      return { error: 'Unauthorized - only IT/Admin can manage inventory' };
    }

    const coll = await dbc('it_inventory');

    const objectIds = ids.map((id) => new ObjectId(id));
    const res = await coll.deleteMany({ _id: { $in: objectIds } });

    if (res.deletedCount > 0) {
      revalidateTag('it-inventory', { expire: 0 });
      return { success: 'deleted', count: res.deletedCount };
    } else {
      return { error: 'not deleted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'bulkDeleteItems server action error' };
  }
}
