"use server";

import { formatDate, formatDateTime } from "@/lib/utils/date-format";
import { getItem as getItemFromDb } from "../actions/crud";
import { ITInventoryItem } from "./types";

export async function getInventoryItem(id: string): Promise<{
  item: ITInventoryItem;
  itemWithFormattedDates: any;
} | null> {
  const item = await getItemFromDb(id);

  if (!item) {
    return null;
  }

  // Format dates for display
  const itemWithFormattedDates = {
    ...item,
    purchaseDateFormatted: formatDate(item.purchaseDate),
    lastReviewFormatted: item.lastReview
      ? formatDate(item.lastReview)
      : undefined,
    createdAtFormatted: formatDateTime(item.createdAt),
    editedAtFormatted: formatDateTime(item.editedAt),
    currentAssignment: item.currentAssignment
      ? {
          ...item.currentAssignment,
          assignedAtFormatted: formatDateTime(
            item.currentAssignment.assignedAt,
          ),
        }
      : undefined,
    assignmentHistory: item.assignmentHistory.map((record) => ({
      ...record,
      assignedAtFormatted: formatDateTime(record.assignedAt),
      unassignedAtFormatted: record.unassignedAt
        ? formatDateTime(record.unassignedAt)
        : undefined,
    })),
  };

  return { item, itemWithFormattedDates };
}
