/**
 * Migration script: Excel competency matrix → MongoDB
 *
 * Parses the HR Excel file (internal-docs/matrix) and inserts:
 *   - ~167 competencies into competency_matrix_competencies
 *   - 82 positions into competency_matrix_positions
 *   - 112 employee ratings into competency_matrix_employee_ratings
 *
 * Environment variables:
 *   MONGO_URI — MongoDB connection string (required)
 *
 * Usage:
 *   # Dry run (parse only, no DB writes)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss_dev" bun run scripts/migrate-competency-matrix.ts --dry-run
 *
 *   # Force (archive existing data, then insert)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss_dev" bun run scripts/migrate-competency-matrix.ts --force
 */

import ExcelJS from 'exceljs';
import { MongoClient, ObjectId } from 'mongodb';
import { resolve } from 'node:path';

// ── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is required.');
  process.exit(1);
}

// ── Constants ────────────────────────────────────────────────────────────
const EXCEL_PATH = resolve(import.meta.dir, '..', 'internal-docs', 'matrix');

const MAIN_SHEET = 'Matrix min. Kompetencji';
const DIFF_SHEET = 'Dzial Matrix AND Diff';
const REF_SHEET = 'Kompetencje wyj.';

const COLLECTIONS = {
  competencies: 'competency_matrix_competencies',
  positions: 'competency_matrix_positions',
  assessments: 'competency_matrix_assessments',
  employeeCertifications: 'competency_matrix_employee_certifications',
  employeeRatings: 'competency_matrix_employee_ratings',
} as const;

// Competency columns: C4 to C170
const COMP_COL_START = 4;
const COMP_COL_END = 170;

// Experience columns: C171-C176
const EXP_COL_START = 171;
const EXP_COL_END = 176;

// Education columns: C177-C182
const EDU_COL_START = 177;
const EDU_COL_END = 182;

// Certification columns: C183-C191
const CERT_COL_START = 183;
const CERT_COL_END = 191;

// Position rows: 9-90
const POS_ROW_START = 9;
const POS_ROW_END = 90;

// ── Mappings ─────────────────────────────────────────────────────────────

const PROCESS_AREA_MAP: Record<string, string> = {
  'BHP': 'bhp',
  'HR': 'hr',
  'FINANSE / FINANCE': 'finance',
  'SYSTEM / QM': 'qm',
  'PROCESS MANAGEMENT / LAUNCH': 'launch',
  'BVP': 'bvp',
  'LOGISTYKA / LOGISTIK': 'logistics',
  'PRODUKCJA / PRODUCTION': 'production',
  'IT': 'it',
  'ZAKUPY / PURCHASE': 'purchasing',
  'JAKOŚĆ / QS': 'quality',
  'LABORATORIUM': 'laboratory',
  'UTRZYMANIE RUCHU / MAINTANANCE': 'maintenance',
  'FORM SERVICE': 'form-service',
  'KOMPETENCJE DODATKOWE / ADDITIONAL COMPETENCES': 'additional',
  'KOMPETENCJE MIĘKKIE / SOFT SKILLS': 'soft-skills',
};

const EXPERIENCE_MAP: Record<number, string> = {
  [EXP_COL_START]: 'none',
  [EXP_COL_START + 1]: '1yr',
  [EXP_COL_START + 2]: '2yr',
  [EXP_COL_START + 3]: '3yr',
  [EXP_COL_START + 4]: '4yr',
  [EXP_COL_START + 5]: '5yr',
};

const EDUCATION_MAP: Record<number, string> = {
  [EDU_COL_START]: 'none',
  [EDU_COL_START + 1]: 'vocational',
  [EDU_COL_START + 2]: 'secondary-general',
  [EDU_COL_START + 3]: 'secondary-specialized',
  [EDU_COL_START + 4]: 'higher-general',
  [EDU_COL_START + 5]: 'higher-specialized',
};

const CERTIFICATION_MAP: Record<number, string> = {
  [CERT_COL_START]: 'first-aid',
  [CERT_COL_START + 1]: 'bhp-specialist',
  [CERT_COL_START + 2]: 'fire-inspector',
  [CERT_COL_START + 3]: 'forklift',
  [CERT_COL_START + 4]: 'sep',
  [CERT_COL_START + 5]: 'sep-supervision',
  [CERT_COL_START + 6]: 'lift',
  [CERT_COL_START + 7]: 'crane',
  [CERT_COL_START + 8]: 'heights',
};

// Diff sheet offsets: cert columns are at +2 from main sheet
const DIFF_CERT_COL_START = CERT_COL_START + 2; // 185
const DIFF_CERT_COL_END = CERT_COL_END + 2; // 193

// Certification map for Diff sheet columns (same types, offset cols)
const DIFF_CERTIFICATION_MAP: Record<number, string> = {
  [DIFF_CERT_COL_START]: 'first-aid',
  [DIFF_CERT_COL_START + 1]: 'bhp-specialist',
  [DIFF_CERT_COL_START + 2]: 'fire-inspector',
  [DIFF_CERT_COL_START + 3]: 'forklift',
  [DIFF_CERT_COL_START + 4]: 'sep',
  [DIFF_CERT_COL_START + 5]: 'sep-supervision',
  [DIFF_CERT_COL_START + 6]: 'lift',
  [DIFF_CERT_COL_START + 7]: 'crane',
  [DIFF_CERT_COL_START + 8]: 'heights',
};

// Generic level descriptions from the Słownik sheet
const GENERIC_LEVELS = {
  1: {
    pl: 'Nieduża wiedza i doświadczenie i/lub praca pod nadzorem',
    de: 'Kleine Wissen, Erfahrung und/oder Arbeit unter Aufsicht',
  },
  2: {
    pl: 'Wystarczająca wiedza i doświadczenie, praca samodzielna',
    de: 'Ausreichende Kenntnisse und Erfahrung, selbstständige Arbeit',
  },
  3: {
    pl: 'Bardzo dobra wiedza i doświadczenie, może szkolić innych',
    de: 'Sehr gute Kenntnisse und Erfahrung, können andere ausbilden',
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) {
    return (v as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join('');
  }
  return String(v).trim();
}

/**
 * Split bilingual name on " / " separator.
 * Only splits if there's exactly one " / " and it doesn't look like
 * it's part of the name itself (e.g. "HTML / CSS" should NOT split).
 */
function splitBilingual(raw: string): { pl: string; de: string } {
  const parts = raw.split(' / ');
  if (parts.length === 2) {
    return { pl: parts[0].trim(), de: parts[1].trim() };
  }
  // For 3+ parts, join first half as PL and second half as DE
  // This handles cases like "A / B / C" → "A" / "B / C"
  // But more commonly, no split is better
  return { pl: raw.trim(), de: '' };
}

function isMarkedX(cell: ExcelJS.Cell): boolean {
  return cellToString(cell).toUpperCase() === 'X';
}

function parseCompetencyLevel(cell: ExcelJS.Cell): number | null {
  const v = cellToString(cell);
  if (!v || v.toLowerCase() === 'n/a') return null;
  const num = parseInt(v, 10);
  if (num >= 1 && num <= 3) return num;
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────

interface ParsedCompetency {
  name: { pl: string; de: string };
  processArea: string;
  levels: {
    1: { pl: string; de: string };
    2: { pl: string; de: string };
    3: { pl: string; de: string };
  };
  sortOrder: number;
  colIndex: number; // for cross-referencing during position parsing
}

interface ParsedPosition {
  name: { pl: string; de: string };
  department: string;
  requiredCompetencies: {
    colIndex: number; // resolved to competencyId later
    requiredLevel: number;
  }[];
  requiredExperience: string;
  requiredEducation: string;
  requiredCertifications: string[];
}

interface ParsedEmployeeRating {
  identifier: string;
  name: string;
  ratings: { colIndex: number; rating: number }[];
}

interface ParsedEmployeeCertification {
  identifier: string;
  name: string;
  certifications: string[]; // e.g. ['first-aid', 'sep']
}

// ── Main migration ───────────────────────────────────────────────────────

async function migrate() {
  console.log('=== Competency Matrix Migration ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : FORCE ? 'FORCE' : 'NORMAL'}`);
  console.log();

  // Phase 0: Setup
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  console.log(`Loaded Excel: ${EXCEL_PATH}`);

  const mainSheet = wb.getWorksheet(MAIN_SHEET);
  if (!mainSheet) {
    console.error(`Sheet "${MAIN_SHEET}" not found`);
    process.exit(1);
  }

  // Phase 1: Parse competencies
  console.log('\n── Phase 1: Parse competencies ──');
  const competencies = parseCompetencies(mainSheet);
  console.log(`Parsed ${competencies.length} competencies`);

  // Group by process area for summary
  const byArea = new Map<string, number>();
  for (const c of competencies) {
    byArea.set(c.processArea, (byArea.get(c.processArea) ?? 0) + 1);
  }
  for (const [area, count] of [...byArea.entries()].sort()) {
    console.log(`  ${area}: ${count}`);
  }

  // Phase 2: Parse positions
  console.log('\n── Phase 2: Parse positions ──');
  const positions = parsePositions(mainSheet);
  console.log(`Parsed ${positions.length} positions`);

  // Summary: competencies per position
  const compCounts = positions.map((p) => p.requiredCompetencies.length);
  const avgComps = compCounts.reduce((a, b) => a + b, 0) / positions.length;
  console.log(
    `  Avg. competencies per position: ${avgComps.toFixed(1)} (min: ${Math.min(...compCounts)}, max: ${Math.max(...compCounts)})`,
  );

  // Check for unmatched process areas
  const warnings: string[] = [];
  for (const c of competencies) {
    if (c.processArea === 'UNKNOWN') {
      warnings.push(`Unmatched process area for competency "${c.name.pl}"`);
    }
  }
  if (warnings.length > 0) {
    console.log('\n⚠ Warnings:');
    for (const w of warnings) console.log(`  ${w}`);
  }

  // Phase 2b: Parse employee ratings from Diff sheet
  console.log('\n── Phase 2b: Parse employee ratings ──');
  const diffSheet = wb.getWorksheet(DIFF_SHEET);
  let employeeRatings: ParsedEmployeeRating[] = [];
  if (!diffSheet) {
    console.log(`Sheet "${DIFF_SHEET}" not found — skipping employee ratings`);
  } else {
    employeeRatings = parseEmployeeRatings(diffSheet);
    console.log(`Parsed ${employeeRatings.length} employees with ratings`);
    const totalRatings = employeeRatings.reduce(
      (sum, e) => sum + e.ratings.length,
      0,
    );
    const avgRatings =
      employeeRatings.length > 0
        ? (totalRatings / employeeRatings.length).toFixed(1)
        : 0;
    console.log(
      `  Total ratings: ${totalRatings}, avg per employee: ${avgRatings}`,
    );
  }

  // Phase 2c: Parse employee certifications from Diff sheet
  console.log('\n── Phase 2c: Parse employee certifications ──');
  let employeeCerts: ParsedEmployeeCertification[] = [];
  if (!diffSheet) {
    console.log(`Sheet "${DIFF_SHEET}" not found — skipping employee certifications`);
  } else {
    employeeCerts = parseEmployeeCertifications(diffSheet);
    console.log(`Parsed ${employeeCerts.length} employees with certifications`);
    const totalCerts = employeeCerts.reduce(
      (sum, e) => sum + e.certifications.length,
      0,
    );
    console.log(`  Total certifications: ${totalCerts}`);
  }

  if (DRY_RUN) {
    console.log('\n── DRY RUN complete — no database changes made ──');
    printDetailedSummary(competencies, positions, employeeRatings, employeeCerts);
    return;
  }

  // Phase 3-5: Database operations
  const client = new MongoClient(MONGO_URI!);
  try {
    await client.connect();
    const db = client.db();
    console.log(`\nConnected to database: ${db.databaseName}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const now = new Date();

    // Phase 3: Insert competencies
    console.log('\n── Phase 3: Insert competencies ──');
    const compColl = db.collection(COLLECTIONS.competencies);

    if (FORCE) {
      const existing = await compColl.countDocuments();
      if (existing > 0) {
        const backupName = `${COLLECTIONS.competencies}_backup_${timestamp}`;
        await db.collection(COLLECTIONS.competencies).rename(backupName);
        console.log(
          `Archived ${existing} existing competencies → ${backupName}`,
        );
      }
    } else {
      const existing = await compColl.countDocuments();
      if (existing > 0) {
        console.error(
          `Abort: ${COLLECTIONS.competencies} already has ${existing} documents. Use --force to archive and replace.`,
        );
        process.exit(1);
      }
    }

    const competencyDocs = competencies.map((c) => ({
      _id: new ObjectId(),
      name: c.name,
      processArea: c.processArea,
      levels: {
        1: c.levels[1],
        2: c.levels[2],
        3: c.levels[3],
      },
      sortOrder: c.sortOrder,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'migration-script',
    }));

    // Build lookup: colIndex → ObjectId
    const colToId = new Map<number, ObjectId>();
    for (let i = 0; i < competencies.length; i++) {
      colToId.set(competencies[i].colIndex, competencyDocs[i]._id);
    }

    const insertCompResult = await db
      .collection(COLLECTIONS.competencies)
      .insertMany(competencyDocs);
    console.log(`Inserted ${insertCompResult.insertedCount} competencies`);

    // Phase 4: Insert positions
    console.log('\n── Phase 4: Insert positions ──');
    const posColl = db.collection(COLLECTIONS.positions);

    if (FORCE) {
      const existing = await posColl.countDocuments();
      if (existing > 0) {
        const backupName = `${COLLECTIONS.positions}_backup_${timestamp}`;
        await db.collection(COLLECTIONS.positions).rename(backupName);
        console.log(`Archived ${existing} existing positions → ${backupName}`);
      }
    } else {
      const existing = await posColl.countDocuments();
      if (existing > 0) {
        console.error(
          `Abort: ${COLLECTIONS.positions} already has ${existing} documents. Use --force to archive and replace.`,
        );
        process.exit(1);
      }
    }

    const positionDocs = positions.map((p) => ({
      name: p.name,
      department: p.department,
      requiredCompetencies: p.requiredCompetencies
        .filter((rc) => colToId.has(rc.colIndex))
        .map((rc) => ({
          competencyId: colToId.get(rc.colIndex)!.toHexString(),
          requiredLevel: rc.requiredLevel,
          weight: 1,
        })),
      requiredExperience: p.requiredExperience,
      requiredEducation: p.requiredEducation,
      requiredCertifications: p.requiredCertifications,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'migration-script',
    }));

    const insertPosResult = await db
      .collection(COLLECTIONS.positions)
      .insertMany(positionDocs);
    console.log(`Inserted ${insertPosResult.insertedCount} positions`);

    // Phase 4b: Insert employee ratings
    console.log('\n── Phase 4b: Insert employee ratings ──');
    let insertedRatingsCount = 0;

    if (employeeRatings.length > 0) {
      const ratingsColl = db.collection(COLLECTIONS.employeeRatings);

      if (FORCE) {
        const existing = await ratingsColl.countDocuments();
        if (existing > 0) {
          const backupName = `${COLLECTIONS.employeeRatings}_backup_${timestamp}`;
          await db.collection(COLLECTIONS.employeeRatings).rename(backupName);
          console.log(
            `Archived ${existing} existing employee ratings → ${backupName}`,
          );
        }
      } else {
        const existing = await ratingsColl.countDocuments();
        if (existing > 0) {
          console.error(
            `Abort: ${COLLECTIONS.employeeRatings} already has ${existing} documents. Use --force to archive and replace.`,
          );
          process.exit(1);
        }
      }

      const ratingDocs = employeeRatings.map((er) => ({
        employeeIdentifier: er.identifier,
        ratings: er.ratings
          .filter((r) => colToId.has(r.colIndex))
          .map((r) => ({
            competencyId: colToId.get(r.colIndex)!.toHexString(),
            rating: r.rating,
          })),
        updatedAt: now,
        updatedBy: 'migration-script',
      }));

      const insertRatingsResult = await db
        .collection(COLLECTIONS.employeeRatings)
        .insertMany(ratingDocs);
      insertedRatingsCount = insertRatingsResult.insertedCount;
      console.log(`Inserted ${insertedRatingsCount} employee rating documents`);
    } else {
      console.log('No employee ratings to insert');
    }

    // Phase 4c: Insert employee certifications
    console.log('\n── Phase 4c: Insert employee certifications ──');
    let insertedCertsCount = 0;

    if (employeeCerts.length > 0) {
      const certsColl = db.collection(COLLECTIONS.employeeCertifications);

      if (FORCE) {
        const existing = await certsColl.countDocuments();
        if (existing > 0) {
          const backupName = `${COLLECTIONS.employeeCertifications}_backup_${timestamp}`;
          await db
            .collection(COLLECTIONS.employeeCertifications)
            .rename(backupName);
          console.log(
            `Archived ${existing} existing employee certifications → ${backupName}`,
          );
        }
      } else {
        const existing = await certsColl.countDocuments();
        if (existing > 0) {
          console.error(
            `Abort: ${COLLECTIONS.employeeCertifications} already has ${existing} documents. Use --force to archive and replace.`,
          );
          process.exit(1);
        }
      }

      // Each employee×certification pair becomes one document
      const certDocs = employeeCerts.flatMap((ec) =>
        ec.certifications.map((certType) => ({
          employeeIdentifier: ec.identifier,
          certificationType: certType,
          issuedDate: now, // Excel has no dates — use migration timestamp
          createdAt: now,
          updatedAt: now,
          createdBy: 'migration-script',
          notes: 'Imported from competency matrix Excel',
        })),
      );

      const insertCertsResult = await db
        .collection(COLLECTIONS.employeeCertifications)
        .insertMany(certDocs);
      insertedCertsCount = insertCertsResult.insertedCount;
      console.log(
        `Inserted ${insertedCertsCount} employee certification documents (${employeeCerts.length} employees)`,
      );
    } else {
      console.log('No employee certifications to insert');
    }

    // Phase 5: Clean up related test data
    console.log('\n── Phase 5: Clean up related data ──');
    if (FORCE) {
      const collName = COLLECTIONS.assessments;
      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      if (count > 0) {
        const backupName = `${collName}_backup_${timestamp}`;
        await coll.rename(backupName);
        console.log(`Archived ${count} docs from ${collName} → ${backupName}`);
      } else {
        console.log(`${collName}: empty, nothing to archive`);
      }
    } else {
      console.log('Skipped (no --force flag)');
    }

    // Phase 6: Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Competencies inserted: ${insertCompResult.insertedCount}`);
    console.log(`Positions inserted: ${insertPosResult.insertedCount}`);
    console.log(`Employee ratings inserted: ${insertedRatingsCount}`);
    console.log(`Employee certifications inserted: ${insertedCertsCount}`);
    console.log(`Process areas: ${byArea.size}`);
    console.log(
      `Backup timestamp: ${timestamp} (use to find backup collections)`,
    );
    console.log('========================');
  } finally {
    await client.close();
  }
}

// ── Parsing functions ────────────────────────────────────────────────────

function parseCompetencies(sheet: ExcelJS.Worksheet): ParsedCompetency[] {
  const row7 = sheet.getRow(7); // Process area headers
  const row8 = sheet.getRow(8); // Competency names

  const competencies: ParsedCompetency[] = [];
  let sortOrder = 0;

  for (let col = COMP_COL_START; col <= COMP_COL_END; col++) {
    const rawName = cellToString(row8.getCell(col));
    if (!rawName) continue;

    const rawArea = cellToString(row7.getCell(col));
    const processArea = PROCESS_AREA_MAP[rawArea] ?? 'UNKNOWN';

    const { pl, de } = splitBilingual(rawName);
    sortOrder++;

    competencies.push({
      name: { pl, de },
      processArea,
      levels: {
        1: { ...GENERIC_LEVELS[1] },
        2: { ...GENERIC_LEVELS[2] },
        3: { ...GENERIC_LEVELS[3] },
      },
      sortOrder,
      colIndex: col,
    });
  }

  return competencies;
}

function parsePositions(sheet: ExcelJS.Worksheet): ParsedPosition[] {
  const positions: ParsedPosition[] = [];

  for (let row = POS_ROW_START; row <= POS_ROW_END; row++) {
    const r = sheet.getRow(row);
    const rawName = cellToString(r.getCell(2));
    if (!rawName) continue;

    const department = cellToString(r.getCell(1));
    const { pl, de } = splitBilingual(rawName);

    // Parse required competencies (cols 4-170)
    const requiredCompetencies: ParsedPosition['requiredCompetencies'] = [];
    for (let col = COMP_COL_START; col <= COMP_COL_END; col++) {
      const level = parseCompetencyLevel(r.getCell(col));
      if (level !== null) {
        requiredCompetencies.push({ colIndex: col, requiredLevel: level });
      }
    }

    // Parse experience (find the column with "X")
    let requiredExperience = 'none';
    for (let col = EXP_COL_START; col <= EXP_COL_END; col++) {
      if (isMarkedX(r.getCell(col))) {
        requiredExperience = EXPERIENCE_MAP[col] ?? 'none';
        break;
      }
    }

    // Parse education (find the column with "X")
    let requiredEducation = 'none';
    for (let col = EDU_COL_START; col <= EDU_COL_END; col++) {
      if (isMarkedX(r.getCell(col))) {
        requiredEducation = EDUCATION_MAP[col] ?? 'none';
        break;
      }
    }

    // Parse certifications (all columns with "X")
    const requiredCertifications: string[] = [];
    for (let col = CERT_COL_START; col <= CERT_COL_END; col++) {
      if (isMarkedX(r.getCell(col))) {
        const cert = CERTIFICATION_MAP[col];
        if (cert) requiredCertifications.push(cert);
      }
    }

    positions.push({
      name: { pl, de },
      department,
      requiredCompetencies,
      requiredExperience,
      requiredEducation,
      requiredCertifications,
    });
  }

  return positions;
}

/**
 * Parse employee ratings from the "Dzial Matrix AND Diff" sheet.
 *
 * Structure:
 * - "Value" rows (every other row starting at 9, col 6 = "Value") contain actual ratings
 * - Col 4: Personnel number (identifier)
 * - Col 5: Employee name
 * - Cols 7–173: Competency ratings (offset +3 from main sheet cols 4–170)
 */
function parseEmployeeRatings(
  sheet: ExcelJS.Worksheet,
): ParsedEmployeeRating[] {
  const employees: ParsedEmployeeRating[] = [];
  const rowCount = sheet.rowCount;

  // Diff sheet competency columns are offset by +3 from main sheet
  const DIFF_COMP_COL_START = COMP_COL_START + 3; // 7
  const DIFF_COMP_COL_END = COMP_COL_END + 3; // 173

  for (let row = 9; row <= rowCount; row++) {
    const r = sheet.getRow(row);
    const marker = cellToString(r.getCell(6));

    // Only process "Value" rows
    if (marker !== 'Value') continue;

    const identifier = cellToString(r.getCell(4));
    const name = cellToString(r.getCell(5));
    if (!identifier) continue;

    const ratings: { colIndex: number; rating: number }[] = [];

    for (
      let col = DIFF_COMP_COL_START;
      col <= DIFF_COMP_COL_END;
      col++
    ) {
      const level = parseCompetencyLevel(r.getCell(col));
      if (level !== null) {
        // Map back to main-sheet column: diff col - 3
        ratings.push({ colIndex: col - 3, rating: level });
      }
    }

    if (ratings.length > 0) {
      employees.push({ identifier, name, ratings });
    }
  }

  return employees;
}

/**
 * Parse employee certifications from the "Dzial Matrix AND Diff" sheet.
 *
 * Same structure as ratings: Value rows contain actual data.
 * Cert columns in Diff sheet are offset +2 from main sheet (cols 185-193).
 */
function parseEmployeeCertifications(
  sheet: ExcelJS.Worksheet,
): ParsedEmployeeCertification[] {
  const employees: ParsedEmployeeCertification[] = [];
  const rowCount = sheet.rowCount;

  for (let row = 9; row <= rowCount; row++) {
    const r = sheet.getRow(row);
    const marker = cellToString(r.getCell(6));

    // Only process "Value" rows (not "Diff" formula rows)
    if (marker !== 'Value') continue;

    const identifier = cellToString(r.getCell(4));
    const name = cellToString(r.getCell(5));
    if (!identifier) continue;

    const certifications: string[] = [];

    for (let col = DIFF_CERT_COL_START; col <= DIFF_CERT_COL_END; col++) {
      if (isMarkedX(r.getCell(col))) {
        const certType = DIFF_CERTIFICATION_MAP[col];
        if (certType) certifications.push(certType);
      }
    }

    if (certifications.length > 0) {
      employees.push({ identifier, name, certifications });
    }
  }

  return employees;
}

function printDetailedSummary(
  competencies: ParsedCompetency[],
  positions: ParsedPosition[],
  employeeRatings: ParsedEmployeeRating[] = [],
  employeeCerts: ParsedEmployeeCertification[] = [],
) {
  console.log('\n── Competency list ──');
  for (const c of competencies) {
    console.log(
      `  [${c.processArea}] ${c.name.pl}${c.name.de ? ' / ' + c.name.de : ''}`,
    );
  }

  console.log('\n── Position list ──');
  for (const p of positions) {
    console.log(
      `  [${p.department}] ${p.name.pl}${p.name.de ? ' / ' + p.name.de : ''} — ${p.requiredCompetencies.length} competencies, exp: ${p.requiredExperience}, edu: ${p.requiredEducation}, certs: ${p.requiredCertifications.length}`,
    );
  }

  if (employeeRatings.length > 0) {
    console.log('\n── Employee ratings list ──');
    for (const er of employeeRatings) {
      console.log(`  [${er.identifier}] ${er.name} — ${er.ratings.length} ratings`);
    }
  }

  if (employeeCerts.length > 0) {
    console.log('\n── Employee certifications list ──');
    for (const ec of employeeCerts) {
      console.log(`  [${ec.identifier}] ${ec.name} — ${ec.certifications.join(', ')}`);
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────────────

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
