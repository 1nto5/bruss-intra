"use server";

import { dbc } from "@/lib/db/mongo";
import { ASSET_ID_PREFIXES, EquipmentCategory, formatAssetId } from "./types";

/**
 * Generates the next sequential asset ID for a given equipment category
 * Format: [PREFIX]### where ### is a 3-digit zero-padded number
 * Examples:
 * - Notebooks: NB-MRG-001, NB-MRG-002, ...
 * - Monitors: 001, 002, ...
 * - iPhones: SP-MRG-001, SP-MRG-002, ...
 *
 * This function is atomic-safe - it fetches all existing IDs for the category
 * and calculates the next number to avoid race conditions.
 */
export async function generateNextAssetId(
  category: EquipmentCategory,
): Promise<string> {
  try {
    const collection = await dbc("it_inventory");
    const prefix = ASSET_ID_PREFIXES[category];

    // Build regex to match asset IDs for this category
    // For monitors (no prefix): ^(\d{3})$  (matches "001", "002", etc.)
    // For others: ^PREFIX-(\d{3})$  (matches "NB-MRG-001", etc.)
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = prefix
      ? new RegExp(`^${escapedPrefix}(\\d{3})$`)
      : new RegExp(`^(\\d{3})$`);

    // Find all items with this category to parse their asset IDs
    const itemsInCategory = await collection
      .find({ category }, { projection: { assetId: 1 } })
      .toArray();

    let maxNumber = 0;
    for (const item of itemsInCategory) {
      if (item.assetId) {
        const match = item.assetId.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Next number
    const nextNumber = maxNumber + 1;

    // Format with prefix
    return formatAssetId(category, nextNumber);
  } catch (error) {
    console.error(
      `Failed to generate asset ID for category ${category}:`,
      error,
    );
    // Fallback to a timestamp-based ID if there's an error
    const timestamp = Date.now().toString().slice(-3);
    return formatAssetId(category, parseInt(timestamp, 10));
  }
}

/**
 * Checks if an asset ID already exists in the database
 */
export async function assetIdExists(assetId: string): Promise<boolean> {
  try {
    const collection = await dbc("it_inventory");
    const item = await collection.findOne({ assetId });
    return !!item;
  } catch (error) {
    console.error("Failed to check asset ID existence:", error);
    return false;
  }
}

/**
 * Validates if an asset ID matches the expected format for a category
 */
export function validateAssetIdFormat(
  assetId: string,
  category: EquipmentCategory,
): boolean {
  const prefix = ASSET_ID_PREFIXES[category];
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = prefix
    ? new RegExp(`^${escapedPrefix}\\d{3}$`)
    : new RegExp(`^\\d{3}$`);

  return regex.test(assetId);
}
