/**
 * One-time cleanup script to delete equipment with inconsistent status-assignment combinations
 *
 * This script deletes all equipment that has BOTH:
 * - currentAssignment (assigned to employee)
 * - "na stanie" status (in stock)
 *
 * Run with: bun run app/[lang]/it-inventory/scripts/cleanup-inconsistent-assignments.ts
 */

import { dbc } from "@/lib/db/mongo";

async function cleanupInconsistentAssignments() {
  try {
    console.log("Starting cleanup of inconsistent equipment assignments...\n");

    const coll = await dbc("it_inventory");

    // Find all items with currentAssignment AND "na stanie" status
    const inconsistentItems = await coll
      .find({
        currentAssignment: { $exists: true, $ne: null },
        statuses: "na stanie",
      })
      .toArray();

    console.log(`Found ${inconsistentItems.length} inconsistent items:\n`);

    if (inconsistentItems.length > 0) {
      // Display items before deletion
      inconsistentItems.forEach((item) => {
        console.log(`- ${item.assetId}: ${item.manufacturer} ${item.model}`);
        console.log(
          `  Assigned to: ${item.currentAssignment.employee.firstName} ${item.currentAssignment.employee.lastName}`,
        );
        console.log(`  Statuses: ${item.statuses.join(", ")}\n`);
      });

      // Delete the inconsistent items
      const result = await coll.deleteMany({
        currentAssignment: { $exists: true, $ne: null },
        statuses: "na stanie",
      });

      console.log(`✓ Deleted ${result.deletedCount} inconsistent items.`);
      console.log("\nCleanup complete! You can now add test data manually.");
    } else {
      console.log("No inconsistent items found. Database is clean!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupInconsistentAssignments();
