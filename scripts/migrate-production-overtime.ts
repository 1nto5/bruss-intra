/**
 * Migration script: production_overtime → overtime_orders
 *
 * Migrates all documents from the old `production_overtime` collection into
 * `overtime_orders`, assigning sequential `internalId` values per year and
 * copying attachment files.
 *
 * Environment variables:
 *   MONGO_URI          — MongoDB connection string (required)
 *   UPLOAD_BASE_PATH   — Root directory for uploaded files (required)
 *
 * Usage:
 *   # Dev (macOS)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss_dev" UPLOAD_BASE_PATH="/Users/adrian/Code/uploads" bun run scripts/migrate-production-overtime.ts
 *
 *   # Production (Windows)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss" UPLOAD_BASE_PATH="D:\uploaded_files" bun run scripts/migrate-production-overtime.ts
 */

import { MongoClient, type Document } from 'mongodb';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const MONGO_URI = process.env.MONGO_URI;
const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is required.');
  process.exit(1);
}

if (!UPLOAD_BASE_PATH) {
  console.error('Error: UPLOAD_BASE_PATH environment variable is required.');
  process.exit(1);
}

const SOURCE_COLLECTION = 'production_overtime';
const TARGET_COLLECTION = 'overtime_orders';
const COUNTERS_COLLECTION = 'counters';

async function migrate() {
  const client = new MongoClient(MONGO_URI!);

  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected to database: ${db.databaseName}`);

    const source = db.collection(SOURCE_COLLECTION);
    const target = db.collection(TARGET_COLLECTION);
    const counters = db.collection(COUNTERS_COLLECTION);

    // Safety check: target must be empty
    const targetCount = await target.countDocuments();
    if (targetCount > 0) {
      console.error(
        `Abort: ${TARGET_COLLECTION} already contains ${targetCount} documents. ` +
          'Migration can only run on an empty target collection.',
      );
      process.exit(1);
    }

    // Read all source docs sorted by requestedAt
    const sourceDocs = await source
      .find({})
      .sort({ requestedAt: 1 })
      .toArray();
    console.log(`Found ${sourceDocs.length} documents in ${SOURCE_COLLECTION}`);

    if (sourceDocs.length === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    // Group by year based on requestedAt
    const byYear = new Map<number, Document[]>();
    for (const doc of sourceDocs) {
      const year = new Date(doc.requestedAt).getFullYear();
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year)!.push(doc);
    }

    // Build migrated docs with sequential internalId per year
    const migratedDocs: Document[] = [];
    const yearCounts = new Map<number, number>();

    for (const [year, docs] of [...byYear.entries()].sort(
      ([a], [b]) => a - b,
    )) {
      const yearShort = String(year).slice(-2);
      let seq = 0;

      for (const doc of docs) {
        seq++;
        const internalId = `${seq}/${yearShort}`;

        const migrated: Document = {
          _id: doc._id,
          internalId,
          status: doc.status,
          numberOfEmployees: doc.numberOfEmployees,
          numberOfShifts: doc.numberOfShifts,
          responsibleEmployee: doc.responsibleEmployee,
          employeesWithScheduledDayOff: doc.employeesWithScheduledDayOff,
          from: doc.from,
          to: doc.to,
          reason: doc.reason,
          note: doc.note,
          requestedAt: doc.requestedAt,
          requestedBy: doc.requestedBy,
          editedAt: doc.editedAt,
          editedBy: doc.editedBy,
          // Map pending fields from the original request fields
          pendingAt: doc.requestedAt,
          pendingBy: doc.requestedBy,
        };

        // Copy optional status-transition fields if present
        if (doc.approvedAt !== undefined) migrated.approvedAt = doc.approvedAt;
        if (doc.approvedBy !== undefined) migrated.approvedBy = doc.approvedBy;
        if (doc.canceledAt !== undefined) migrated.canceledAt = doc.canceledAt;
        if (doc.canceledBy !== undefined) migrated.canceledBy = doc.canceledBy;
        if (doc.completedAt !== undefined)
          migrated.completedAt = doc.completedAt;
        if (doc.completedBy !== undefined)
          migrated.completedBy = doc.completedBy;
        if (doc.accountedAt !== undefined)
          migrated.accountedAt = doc.accountedAt;
        if (doc.accountedBy !== undefined)
          migrated.accountedBy = doc.accountedBy;
        if (doc.hasAttachment !== undefined)
          migrated.hasAttachment = doc.hasAttachment;
        if (doc.attachmentFilename !== undefined)
          migrated.attachmentFilename = doc.attachmentFilename;

        migratedDocs.push(migrated);
      }

      yearCounts.set(year, seq);
      console.log(`  ${year}: ${seq} documents (internalId 1/${yearShort} → ${seq}/${yearShort})`);
    }

    // Insert all migrated docs
    const insertResult = await target.insertMany(migratedDocs);
    console.log(
      `\nInserted ${insertResult.insertedCount} documents into ${TARGET_COLLECTION}`,
    );

    // Upsert counters for each year
    for (const [year, count] of yearCounts) {
      const counterId = `${TARGET_COLLECTION}_${year}`;
      await counters.updateOne(
        { _id: counterId as unknown as import('mongodb').ObjectId },
        { $set: { seq: count } },
        { upsert: true },
      );
      console.log(`  Counter "${counterId}" set to ${count}`);
    }

    // Copy attachment files
    const sourceDir = join(UPLOAD_BASE_PATH!, SOURCE_COLLECTION);
    const targetDir = join(UPLOAD_BASE_PATH!, TARGET_COLLECTION);

    let filesCopied = 0;
    let filesMissing = 0;

    const docsWithAttachments = migratedDocs.filter(
      (d) => d.hasAttachment && d.attachmentFilename,
    );

    if (docsWithAttachments.length > 0) {
      // Ensure target directory exists
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
        console.log(`\nCreated directory: ${targetDir}`);
      }

      console.log(
        `\nCopying ${docsWithAttachments.length} attachment files...`,
      );

      for (const doc of docsWithAttachments) {
        const filename = doc.attachmentFilename as string;
        const srcPath = join(sourceDir, filename);
        const destPath = join(targetDir, filename);

        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath);
          filesCopied++;
        } else {
          console.warn(`  MISSING: ${srcPath}`);
          filesMissing++;
        }
      }
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Documents migrated: ${insertResult.insertedCount}`);
    for (const [year, count] of [...yearCounts.entries()].sort(
      ([a], [b]) => a - b,
    )) {
      console.log(`  ${year}: ${count}`);
    }
    console.log(`Attachment files copied: ${filesCopied}`);
    if (filesMissing > 0) {
      console.log(`Attachment files missing: ${filesMissing}`);
    }
    console.log('========================');
  } finally {
    await client.close();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
