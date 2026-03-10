/**
 * Migration script: Excel competency matrix -> MongoDB
 *
 * Parses TWO HR Excel files and inserts unified data:
 *   - Office file (internal-docs/matrix): ~167 competencies, 82 positions, 112 employees
 *   - Production file (internal-docs/matrix-produkcja): ~165 competencies, 8 positions, 299 employees
 *
 * Competencies are deduplicated by Polish name across both files.
 * Result: ~186 unified competencies, 90 positions, ~411 employee ratings.
 *
 * Environment variables:
 *   MONGO_URI - MongoDB connection string (required)
 *
 * Usage:
 *   # Dry run (parse only, no DB writes)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss_dev" bun run scripts/migrate-competency-matrix.ts --dry-run
 *
 *   # Force (archive existing data, then insert)
 *   MONGO_URI="mongodb://127.0.0.1/next_bruss_dev" bun run scripts/migrate-competency-matrix.ts --force
 */

import ExcelJS from "exceljs";
import { MongoClient, ObjectId } from "mongodb";
import { resolve } from "node:path";

// ── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Error: MONGO_URI environment variable is required.");
  process.exit(1);
}

// ── File configuration ──────────────────────────────────────────────────

interface FileConfig {
  path: string;
  label: string;
  compColStart: number;
  compColEnd: number;
  expColStart: number;
  expColEnd: number;
  eduColStart: number;
  eduColEnd: number;
  certColStart: number;
  certColEnd: number;
  posRowStart: number;
  posRowEnd: number;
  diffCompOffset: number;
  diffCertColStart: number;
  diffCertColEnd: number;
}

const OFFICE_CONFIG: FileConfig = {
  path: resolve(import.meta.dir, "..", "internal-docs", "matrix"),
  label: "office",
  compColStart: 4,
  compColEnd: 170,
  expColStart: 171,
  expColEnd: 176,
  eduColStart: 177,
  eduColEnd: 182,
  certColStart: 183,
  certColEnd: 191,
  posRowStart: 9,
  posRowEnd: 90,
  diffCompOffset: 3,
  diffCertColStart: 185,
  diffCertColEnd: 193,
};

const PRODUCTION_CONFIG: FileConfig = {
  path: resolve(import.meta.dir, "..", "internal-docs", "matrix-produkcja"),
  label: "production",
  compColStart: 4,
  compColEnd: 168,
  expColStart: 169,
  expColEnd: 174,
  eduColStart: 175,
  eduColEnd: 180,
  certColStart: 181,
  certColEnd: 189,
  posRowStart: 9,
  posRowEnd: 16,
  diffCompOffset: 3,
  diffCertColStart: 200,
  diffCertColEnd: 208,
};

// ── Constants ────────────────────────────────────────────────────────────

const MAIN_SHEET = "Matrix min. Kompetencji";
const DIFF_SHEET = "Dzial Matrix AND Diff";

const COLLECTIONS = {
  competencies: "competency_matrix_competencies",
  positions: "competency_matrix_positions",
  assessments: "competency_matrix_assessments",
  employeeCertifications: "competency_matrix_employee_certifications",
  employeeRatings: "competency_matrix_employee_ratings",
  employees: "employees",
} as const;

// Placeholder competency names to skip
const SKIP_COMPETENCY_NAMES = new Set(["kolumna1"]);

// ── Mappings ─────────────────────────────────────────────────────────────

const PROCESS_AREA_MAP: Record<string, string> = {
  BHP: "bhp",
  HR: "hr",
  "FINANSE / FINANCE": "finance",
  "SYSTEM / QM": "qm",
  "PROCESS MANAGEMENT / LAUNCH": "launch",
  BVP: "bvp",
  "LOGISTYKA / LOGISTIK": "logistics",
  "PRODUKCJA / PRODUCTION": "production",
  "POWLEKANIE / COATING": "coating",
  IT: "it",
  "ZAKUPY / PURCHASE": "purchasing",
  "JAKOŚĆ / QS": "quality",
  LABORATORIUM: "laboratory",
  "UTRZYMANIE RUCHU / MAINTANANCE": "maintenance",
  "FORM SERVICE": "form-service",
  "KOMPETENCJE DODATKOWE / ADDITIONAL COMPETENCES": "additional",
  "KOMPETENCJE MIĘKKIE / SOFT SKILLS": "soft-skills",
};

const EXPERIENCE_LABELS = ["none", "1yr", "2yr", "3yr", "4yr", "5yr"];
const EDUCATION_LABELS = [
  "none",
  "vocational",
  "secondary-general",
  "secondary-specialized",
  "higher-general",
  "higher-specialized",
];
const CERTIFICATION_LABELS = [
  "first-aid",
  "bhp-specialist",
  "fire-inspector",
  "forklift",
  "sep",
  "sep-supervision",
  "lift",
  "crane",
  "heights",
];

function buildOffsetMap(
  start: number,
  labels: string[],
): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i < labels.length; i++) {
    map[start + i] = labels[i];
  }
  return map;
}

// Generic level descriptions from the Slownik sheet
const GENERIC_LEVELS = {
  1: {
    pl: "Nieduża wiedza i doświadczenie i/lub praca pod nadzorem",
    de: "Kleine Wissen, Erfahrung und/oder Arbeit unter Aufsicht",
  },
  2: {
    pl: "Wystarczająca wiedza i doświadczenie, praca samodzielna",
    de: "Ausreichende Kenntnisse und Erfahrung, selbstständige Arbeit",
  },
  3: {
    pl: "Bardzo dobra wiedza i doświadczenie, może szkolić innych",
    de: "Sehr gute Kenntnisse und Erfahrung, können andere ausbilden",
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────

function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) {
      return (v as ExcelJS.CellRichTextValue).richText
        .map((r) => r.text)
        .join("");
    }
    // Formula cells have a `result` property with the computed value
    if ("result" in v) {
      const result = (v as ExcelJS.CellFormulaValue).result;
      return result != null ? String(result).trim() : "";
    }
    // Hyperlink cells have a `text` property
    if ("text" in v) {
      return String((v as ExcelJS.CellHyperlinkValue).text).trim();
    }
  }
  return String(v).trim();
}

/**
 * Split bilingual name on " / " separator.
 * Only splits if there's exactly one " / " and it doesn't look like
 * it's part of the name itself (e.g. "HTML / CSS" should NOT split).
 */
function splitBilingual(raw: string): { pl: string; de: string } {
  const parts = raw.split(" / ");
  if (parts.length === 2) {
    return { pl: parts[0].trim(), de: parts[1].trim() };
  }
  return { pl: raw.trim(), de: "" };
}

function isMarkedX(cell: ExcelJS.Cell): boolean {
  return cellToString(cell).toUpperCase() === "X";
}

function parseCompetencyLevel(cell: ExcelJS.Cell): number | null {
  const v = cellToString(cell);
  if (!v || v.toLowerCase() === "n/a") return null;
  const num = parseInt(v, 10);
  if (num >= 1 && num <= 3) return num;
  return null;
}

function normalizeCompName(pl: string): string {
  return pl.trim().toLowerCase();
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
  colIndex: number;
  sourceFile: string;
}

interface ParsedPosition {
  name: { pl: string; de: string };
  department: string;
  requiredCompetencies: {
    colIndex: number;
    requiredLevel: number;
  }[];
  requiredExperience: string;
  requiredEducation: string;
  requiredCertifications: string[];
  sourceFile: string;
}

interface ParsedEmployeeRating {
  identifier: string;
  name: string;
  ratings: { colIndex: number; rating: number }[];
  sourceFile: string;
}

interface ParsedEmployeeCertification {
  identifier: string;
  name: string;
  certifications: string[];
}

interface ParsedEmployee {
  identifier: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  sourceFile: string;
}

// ── Parsing functions ────────────────────────────────────────────────────

function parseCompetencies(
  sheet: ExcelJS.Worksheet,
  config: FileConfig,
): ParsedCompetency[] {
  const row7 = sheet.getRow(7);
  const row8 = sheet.getRow(8);

  const competencies: ParsedCompetency[] = [];
  let sortOrder = 0;

  for (let col = config.compColStart; col <= config.compColEnd; col++) {
    const rawName = cellToString(row8.getCell(col));
    if (!rawName) continue;

    // Skip placeholder competencies
    if (SKIP_COMPETENCY_NAMES.has(normalizeCompName(rawName))) continue;

    const rawArea = cellToString(row7.getCell(col));
    const processArea = PROCESS_AREA_MAP[rawArea] ?? "UNKNOWN";

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
      sourceFile: config.label,
    });
  }

  return competencies;
}

function parsePositions(
  sheet: ExcelJS.Worksheet,
  config: FileConfig,
): ParsedPosition[] {
  const positions: ParsedPosition[] = [];
  const expMap = buildOffsetMap(config.expColStart, EXPERIENCE_LABELS);
  const eduMap = buildOffsetMap(config.eduColStart, EDUCATION_LABELS);
  const certMap = buildOffsetMap(config.certColStart, CERTIFICATION_LABELS);

  for (let row = config.posRowStart; row <= config.posRowEnd; row++) {
    const r = sheet.getRow(row);
    const rawName = cellToString(r.getCell(2));
    if (!rawName) continue;

    const department = cellToString(r.getCell(1));
    const { pl, de } = splitBilingual(rawName);

    const requiredCompetencies: ParsedPosition["requiredCompetencies"] = [];
    for (let col = config.compColStart; col <= config.compColEnd; col++) {
      const level = parseCompetencyLevel(r.getCell(col));
      if (level !== null) {
        requiredCompetencies.push({ colIndex: col, requiredLevel: level });
      }
    }

    let requiredExperience = "none";
    for (let col = config.expColStart; col <= config.expColEnd; col++) {
      if (isMarkedX(r.getCell(col))) {
        requiredExperience = expMap[col] ?? "none";
        break;
      }
    }

    let requiredEducation = "none";
    for (let col = config.eduColStart; col <= config.eduColEnd; col++) {
      if (isMarkedX(r.getCell(col))) {
        requiredEducation = eduMap[col] ?? "none";
        break;
      }
    }

    const requiredCertifications: string[] = [];
    for (let col = config.certColStart; col <= config.certColEnd; col++) {
      if (isMarkedX(r.getCell(col))) {
        const cert = certMap[col];
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
      sourceFile: config.label,
    });
  }

  return positions;
}

function parseEmployeeRatings(
  sheet: ExcelJS.Worksheet,
  config: FileConfig,
): ParsedEmployeeRating[] {
  const employees: ParsedEmployeeRating[] = [];
  const rowCount = sheet.rowCount;

  const diffCompStart = config.compColStart + config.diffCompOffset;
  const diffCompEnd = config.compColEnd + config.diffCompOffset;

  for (let row = 9; row <= rowCount; row++) {
    const r = sheet.getRow(row);
    const marker = cellToString(r.getCell(6));
    if (marker !== "Value") continue;

    const identifier = cellToString(r.getCell(4));
    const name = cellToString(r.getCell(5));
    if (!identifier) continue;

    const ratings: { colIndex: number; rating: number }[] = [];

    for (let col = diffCompStart; col <= diffCompEnd; col++) {
      const level = parseCompetencyLevel(r.getCell(col));
      if (level !== null) {
        // Map back to main-sheet column
        ratings.push({
          colIndex: col - config.diffCompOffset,
          rating: level,
        });
      }
    }

    if (ratings.length > 0) {
      employees.push({ identifier, name, ratings, sourceFile: config.label });
    }
  }

  return employees;
}

function parseEmployeeCertifications(
  sheet: ExcelJS.Worksheet,
  config: FileConfig,
): ParsedEmployeeCertification[] {
  const employees: ParsedEmployeeCertification[] = [];
  const rowCount = sheet.rowCount;
  const certMap = buildOffsetMap(config.diffCertColStart, CERTIFICATION_LABELS);

  for (let row = 9; row <= rowCount; row++) {
    const r = sheet.getRow(row);
    const marker = cellToString(r.getCell(6));
    if (marker !== "Value") continue;

    const identifier = cellToString(r.getCell(4));
    const name = cellToString(r.getCell(5));
    if (!identifier) continue;

    const certifications: string[] = [];

    for (
      let col = config.diffCertColStart;
      col <= config.diffCertColEnd;
      col++
    ) {
      if (isMarkedX(r.getCell(col))) {
        const certType = certMap[col];
        if (certType) certifications.push(certType);
      }
    }

    if (certifications.length > 0) {
      employees.push({ identifier, name, certifications });
    }
  }

  return employees;
}

function parseEmployees(
  sheet: ExcelJS.Worksheet,
  config: FileConfig,
): ParsedEmployee[] {
  const employees: ParsedEmployee[] = [];
  const rowCount = sheet.rowCount;

  for (let row = 9; row <= rowCount; row++) {
    const r = sheet.getRow(row);
    const marker = cellToString(r.getCell(6));
    if (marker !== "Value") continue;

    const identifier = cellToString(r.getCell(4));
    const fullName = cellToString(r.getCell(5));
    if (!identifier || !fullName) continue;

    const department = cellToString(r.getCell(1));
    const rawPosition = cellToString(r.getCell(2));
    const { pl: position } = splitBilingual(rawPosition);

    // Names are "Lastname Firstname" format in the Excel
    const spaceIdx = fullName.indexOf(" ");
    const lastName = spaceIdx > 0 ? fullName.substring(0, spaceIdx) : fullName;
    const firstName = spaceIdx > 0 ? fullName.substring(spaceIdx + 1) : "";

    employees.push({
      identifier,
      firstName,
      lastName,
      position,
      department,
      sourceFile: config.label,
    });
  }

  return employees;
}

// ── Deduplication ────────────────────────────────────────────────────────

interface DeduplicatedCompetency extends ParsedCompetency {
  /** Maps source file label -> original colIndex in that file */
  colIndexByFile: Map<string, number>;
}

function deduplicateCompetencies(
  officeComps: ParsedCompetency[],
  productionComps: ParsedCompetency[],
): DeduplicatedCompetency[] {
  const result: DeduplicatedCompetency[] = [];
  const byName = new Map<string, DeduplicatedCompetency>();

  // Office competencies are canonical
  for (const c of officeComps) {
    const key = normalizeCompName(c.name.pl);
    const deduped: DeduplicatedCompetency = {
      ...c,
      colIndexByFile: new Map([[c.sourceFile, c.colIndex]]),
    };
    result.push(deduped);
    byName.set(key, deduped);
  }

  // Merge production competencies
  let newCount = 0;
  let matchedCount = 0;
  for (const c of productionComps) {
    const key = normalizeCompName(c.name.pl);
    const existing = byName.get(key);

    if (existing) {
      // Shared competency - add production column mapping
      existing.colIndexByFile.set(c.sourceFile, c.colIndex);
      matchedCount++;
    } else {
      // Production-only competency - add as new
      const deduped: DeduplicatedCompetency = {
        ...c,
        sortOrder: result.length + 1,
        colIndexByFile: new Map([[c.sourceFile, c.colIndex]]),
      };
      result.push(deduped);
      byName.set(key, deduped);
      newCount++;
    }
  }

  console.log(
    `  Dedup: ${matchedCount} shared, ${newCount} production-only added`,
  );
  console.log(`  Total unified competencies: ${result.length}`);

  return result;
}

// ── Main migration ───────────────────────────────────────────────────────

async function migrate() {
  console.log("=== Competency Matrix Migration (Office + Production) ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : FORCE ? "FORCE" : "NORMAL"}`);
  console.log();

  // Phase 0: Load both Excel workbooks
  console.log("── Phase 0: Load Excel files ──");
  const officeWb = new ExcelJS.Workbook();
  await officeWb.xlsx.readFile(OFFICE_CONFIG.path);
  console.log(`Loaded office file: ${OFFICE_CONFIG.path}`);

  const prodWb = new ExcelJS.Workbook();
  await prodWb.xlsx.readFile(PRODUCTION_CONFIG.path);
  console.log(`Loaded production file: ${PRODUCTION_CONFIG.path}`);

  const officeMain = officeWb.getWorksheet(MAIN_SHEET);
  const prodMain = prodWb.getWorksheet(MAIN_SHEET);
  if (!officeMain || !prodMain) {
    console.error(`Sheet "${MAIN_SHEET}" not found in one or both files`);
    process.exit(1);
  }

  // Phase 1: Parse and deduplicate competencies
  console.log("\n── Phase 1: Parse competencies ──");
  const officeComps = parseCompetencies(officeMain, OFFICE_CONFIG);
  console.log(`  Office: ${officeComps.length} competencies`);
  const prodComps = parseCompetencies(prodMain, PRODUCTION_CONFIG);
  console.log(`  Production: ${prodComps.length} competencies`);

  const competencies = deduplicateCompetencies(officeComps, prodComps);

  // Group by process area for summary
  const byArea = new Map<string, number>();
  for (const c of competencies) {
    byArea.set(c.processArea, (byArea.get(c.processArea) ?? 0) + 1);
  }
  for (const [area, count] of [...byArea.entries()].sort()) {
    console.log(`  ${area}: ${count}`);
  }

  // Check for unmatched process areas
  const warnings: string[] = [];
  for (const c of competencies) {
    if (c.processArea === "UNKNOWN") {
      warnings.push(
        `Unmatched process area for competency "${c.name.pl}" (${c.sourceFile})`,
      );
    }
  }
  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ${w}`);
  }

  // Phase 2: Parse positions from both files
  console.log("\n── Phase 2: Parse positions ──");
  const officePositions = parsePositions(officeMain, OFFICE_CONFIG);
  console.log(`  Office: ${officePositions.length} positions`);
  const prodPositions = parsePositions(prodMain, PRODUCTION_CONFIG);
  console.log(`  Production: ${prodPositions.length} positions`);
  const positions = [...officePositions, ...prodPositions];
  console.log(`  Total: ${positions.length} positions`);

  if (positions.length > 0) {
    const compCounts = positions.map((p) => p.requiredCompetencies.length);
    const avgComps = compCounts.reduce((a, b) => a + b, 0) / positions.length;
    console.log(
      `  Avg. competencies per position: ${avgComps.toFixed(1)} (min: ${Math.min(...compCounts)}, max: ${Math.max(...compCounts)})`,
    );
  }

  // Phase 3: Parse employee ratings from both diff sheets
  console.log("\n── Phase 3: Parse employee ratings ──");
  const officeDiff = officeWb.getWorksheet(DIFF_SHEET);
  const prodDiff = prodWb.getWorksheet(DIFF_SHEET);

  let employeeRatings: ParsedEmployeeRating[] = [];
  if (officeDiff) {
    const officeRatings = parseEmployeeRatings(officeDiff, OFFICE_CONFIG);
    console.log(`  Office: ${officeRatings.length} employees with ratings`);
    employeeRatings.push(...officeRatings);
  } else {
    console.log(`  Office: "${DIFF_SHEET}" not found, skipping`);
  }
  if (prodDiff) {
    const prodRatings = parseEmployeeRatings(prodDiff, PRODUCTION_CONFIG);
    console.log(`  Production: ${prodRatings.length} employees with ratings`);
    employeeRatings.push(...prodRatings);
  } else {
    console.log(`  Production: "${DIFF_SHEET}" not found, skipping`);
  }
  console.log(`  Total: ${employeeRatings.length} employees`);

  const totalRatings = employeeRatings.reduce(
    (sum, e) => sum + e.ratings.length,
    0,
  );
  const avgRatings =
    employeeRatings.length > 0
      ? (totalRatings / employeeRatings.length).toFixed(1)
      : "0";
  console.log(
    `  Total ratings: ${totalRatings}, avg per employee: ${avgRatings}`,
  );

  // Phase 4: Parse employee certifications from both diff sheets
  console.log("\n── Phase 4: Parse employee certifications ──");
  let employeeCerts: ParsedEmployeeCertification[] = [];
  if (officeDiff) {
    const officeCerts = parseEmployeeCertifications(officeDiff, OFFICE_CONFIG);
    console.log(
      `  Office: ${officeCerts.length} employees with certifications`,
    );
    employeeCerts.push(...officeCerts);
  }
  if (prodDiff) {
    const prodCerts = parseEmployeeCertifications(prodDiff, PRODUCTION_CONFIG);
    console.log(
      `  Production: ${prodCerts.length} employees with certifications`,
    );
    employeeCerts.push(...prodCerts);
  }
  console.log(`  Total: ${employeeCerts.length} employees`);
  const totalCerts = employeeCerts.reduce(
    (sum, e) => sum + e.certifications.length,
    0,
  );
  console.log(`  Total certifications: ${totalCerts}`);

  // Phase 4b: Parse employee master data from both diff sheets
  console.log("\n── Phase 4b: Parse employees ──");
  const employeeMap = new Map<string, ParsedEmployee>();
  if (officeDiff) {
    const officeEmps = parseEmployees(officeDiff, OFFICE_CONFIG);
    console.log(`  Office: ${officeEmps.length} employees`);
    for (const e of officeEmps) employeeMap.set(e.identifier, e);
  }
  if (prodDiff) {
    const prodEmps = parseEmployees(prodDiff, PRODUCTION_CONFIG);
    console.log(`  Production: ${prodEmps.length} employees`);
    for (const e of prodEmps) {
      if (!employeeMap.has(e.identifier)) employeeMap.set(e.identifier, e);
    }
  }
  const employees = [...employeeMap.values()];
  console.log(`  Total unique employees: ${employees.length}`);

  // Summary of departments
  const byDept = new Map<string, number>();
  for (const e of employees) {
    byDept.set(e.department, (byDept.get(e.department) ?? 0) + 1);
  }
  for (const [dept, count] of [...byDept.entries()].sort()) {
    console.log(`    ${dept}: ${count}`);
  }

  if (DRY_RUN) {
    console.log("\n── DRY RUN complete - no database changes made ──");
    printDetailedSummary(
      competencies,
      positions,
      employeeRatings,
      employeeCerts,
      employees,
    );
    return;
  }

  // Phase 5-8: Database operations
  const client = new MongoClient(MONGO_URI!);
  try {
    await client.connect();
    const db = client.db();
    console.log(`\nConnected to database: ${db.databaseName}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const now = new Date();

    // Phase 5: Insert competencies
    console.log("\n── Phase 5: Insert competencies ──");
    await archiveOrAbort(db, COLLECTIONS.competencies, FORCE, timestamp);

    const competencyDocs = competencies.map((c) => ({
      _id: new ObjectId(),
      name: c.name,
      processArea: c.processArea,
      levels: { 1: c.levels[1], 2: c.levels[2], 3: c.levels[3] },
      sortOrder: c.sortOrder,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: "migration-script",
    }));

    // Build per-file colIndex -> ObjectId lookup maps
    const colToIdByFile = new Map<string, Map<number, ObjectId>>();
    for (const label of ["office", "production"]) {
      colToIdByFile.set(label, new Map());
    }

    for (let i = 0; i < competencies.length; i++) {
      const comp = competencies[i];
      const docId = competencyDocs[i]._id;
      for (const [fileLabel, colIndex] of comp.colIndexByFile) {
        colToIdByFile.get(fileLabel)!.set(colIndex, docId);
      }
    }

    const insertCompResult = await db
      .collection(COLLECTIONS.competencies)
      .insertMany(competencyDocs);
    console.log(`Inserted ${insertCompResult.insertedCount} competencies`);

    // Phase 6: Insert positions
    console.log("\n── Phase 6: Insert positions ──");
    await archiveOrAbort(db, COLLECTIONS.positions, FORCE, timestamp);

    const positionDocs = positions.map((p) => {
      const colToId = colToIdByFile.get(p.sourceFile)!;
      return {
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
        createdBy: "migration-script",
      };
    });

    const insertPosResult = await db
      .collection(COLLECTIONS.positions)
      .insertMany(positionDocs);
    console.log(`Inserted ${insertPosResult.insertedCount} positions`);

    // Phase 7: Insert employee ratings
    console.log("\n── Phase 7: Insert employee ratings ──");
    let insertedRatingsCount = 0;

    if (employeeRatings.length > 0) {
      await archiveOrAbort(db, COLLECTIONS.employeeRatings, FORCE, timestamp);

      const ratingDocs = employeeRatings.map((er) => {
        const colToId = colToIdByFile.get(er.sourceFile)!;
        return {
          employeeIdentifier: er.identifier,
          ratings: er.ratings
            .filter((r) => colToId.has(r.colIndex))
            .map((r) => ({
              competencyId: colToId.get(r.colIndex)!.toHexString(),
              rating: r.rating,
            })),
          updatedAt: now,
          updatedBy: "migration-script",
        };
      });

      const insertRatingsResult = await db
        .collection(COLLECTIONS.employeeRatings)
        .insertMany(ratingDocs);
      insertedRatingsCount = insertRatingsResult.insertedCount;
      console.log(`Inserted ${insertedRatingsCount} employee rating documents`);
    } else {
      console.log("No employee ratings to insert");
    }

    // Phase 8: Insert employee certifications
    console.log("\n── Phase 8: Insert employee certifications ──");
    let insertedCertsCount = 0;

    if (employeeCerts.length > 0) {
      await archiveOrAbort(
        db,
        COLLECTIONS.employeeCertifications,
        FORCE,
        timestamp,
      );

      const certDocs = employeeCerts.flatMap((ec) =>
        ec.certifications.map((certType) => ({
          employeeIdentifier: ec.identifier,
          certificationType: certType,
          issuedDate: now,
          createdAt: now,
          updatedAt: now,
          createdBy: "migration-script",
          notes: "Imported from competency matrix Excel",
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
      console.log("No employee certifications to insert");
    }

    // Phase 8b: Upsert employees into shared employees collection
    console.log("\n── Phase 8b: Upsert employees ──");
    let upsertedCount = 0;
    let skippedCount = 0;

    if (employees.length > 0) {
      const empColl = db.collection(COLLECTIONS.employees);

      // Find which identifiers already exist
      const existingIds = new Set(
        (
          await empColl
            .find(
              { identifier: { $in: employees.map((e) => e.identifier) } },
              { projection: { identifier: 1 } },
            )
            .toArray()
        ).map((d) => d.identifier as string),
      );

      const newEmployees = employees.filter(
        (e) => !existingIds.has(e.identifier),
      );
      skippedCount = employees.length - newEmployees.length;

      if (newEmployees.length > 0) {
        const empDocs = newEmployees.map((e) => ({
          identifier: e.identifier,
          firstName: e.firstName,
          lastName: e.lastName,
          position: e.position,
          department: e.department,
          createdAt: now,
          createdBy: "migration-script",
        }));

        const insertResult = await empColl.insertMany(empDocs);
        upsertedCount = insertResult.insertedCount;
      }

      console.log(
        `Inserted ${upsertedCount} new employees, skipped ${skippedCount} existing`,
      );
    } else {
      console.log("No employees to insert");
    }

    // Clean up assessments collection
    if (FORCE) {
      const collName = COLLECTIONS.assessments;
      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      if (count > 0) {
        const backupName = `${collName}_backup_${timestamp}`;
        await coll.rename(backupName);
        console.log(`Archived ${count} docs from ${collName} -> ${backupName}`);
      }
    }

    // Phase 9: Summary
    console.log("\n=== Migration Summary ===");
    console.log(`Competencies inserted: ${insertCompResult.insertedCount}`);
    console.log(`Positions inserted: ${insertPosResult.insertedCount}`);
    console.log(`Employee ratings inserted: ${insertedRatingsCount}`);
    console.log(`Employee certifications inserted: ${insertedCertsCount}`);
    console.log(
      `Employees inserted: ${upsertedCount} new, ${skippedCount} already existed`,
    );
    console.log(`Process areas: ${byArea.size}`);
    console.log(
      `Backup timestamp: ${timestamp} (use to find backup collections)`,
    );
    console.log("========================");
  } finally {
    await client.close();
  }
}

// ── Database helpers ─────────────────────────────────────────────────────

async function archiveOrAbort(
  db: ReturnType<MongoClient["db"]>,
  collectionName: string,
  force: boolean,
  timestamp: string,
) {
  const coll = db.collection(collectionName);
  const existing = await coll.countDocuments();
  if (existing === 0) return;

  if (force) {
    const backupName = `${collectionName}_backup_${timestamp}`;
    await coll.rename(backupName);
    console.log(`Archived ${existing} existing docs -> ${backupName}`);
  } else {
    console.error(
      `Abort: ${collectionName} already has ${existing} documents. Use --force to archive and replace.`,
    );
    process.exit(1);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────

function printDetailedSummary(
  competencies: DeduplicatedCompetency[],
  positions: ParsedPosition[],
  employeeRatings: ParsedEmployeeRating[] = [],
  employeeCerts: ParsedEmployeeCertification[] = [],
  employees: ParsedEmployee[] = [],
) {
  console.log("\n── Competency list ──");
  for (const c of competencies) {
    const sources = [...c.colIndexByFile.entries()]
      .map(([f, col]) => `${f}:col${col}`)
      .join(", ");
    console.log(
      `  [${c.processArea}] ${c.name.pl}${c.name.de ? " / " + c.name.de : ""} (${sources})`,
    );
  }

  // Log production-only competencies
  const prodOnly = competencies.filter(
    (c) => c.colIndexByFile.size === 1 && c.colIndexByFile.has("production"),
  );
  if (prodOnly.length > 0) {
    console.log(`\n── Production-only competencies (${prodOnly.length}) ──`);
    for (const c of prodOnly) {
      console.log(`  [${c.processArea}] ${c.name.pl}`);
    }
  }

  // Log office-only competencies
  const officeOnly = competencies.filter(
    (c) => c.colIndexByFile.size === 1 && c.colIndexByFile.has("office"),
  );
  if (officeOnly.length > 0) {
    console.log(`\n── Office-only competencies (${officeOnly.length}) ──`);
    for (const c of officeOnly) {
      console.log(`  [${c.processArea}] ${c.name.pl}`);
    }
  }

  console.log("\n── Position list ──");
  for (const p of positions) {
    console.log(
      `  [${p.sourceFile}] [${p.department}] ${p.name.pl}${p.name.de ? " / " + p.name.de : ""} - ${p.requiredCompetencies.length} competencies, exp: ${p.requiredExperience}, edu: ${p.requiredEducation}, certs: ${p.requiredCertifications.length}`,
    );
  }

  if (employeeRatings.length > 0) {
    console.log("\n── Employee ratings list ──");
    for (const er of employeeRatings) {
      console.log(
        `  [${er.sourceFile}] [${er.identifier}] ${er.name} - ${er.ratings.length} ratings`,
      );
    }
  }

  if (employeeCerts.length > 0) {
    console.log("\n── Employee certifications list ──");
    for (const ec of employeeCerts) {
      console.log(
        `  [${ec.identifier}] ${ec.name} - ${ec.certifications.join(", ")}`,
      );
    }
  }

  if (employees.length > 0) {
    console.log(`\n── Employee master data (${employees.length}) ──`);
    for (const e of employees) {
      console.log(
        `  [${e.sourceFile}] [${e.identifier}] ${e.lastName} ${e.firstName} - ${e.department} / ${e.position}`,
      );
    }
  }
}

// ── Run ──────────────────────────────────────────────────────────────────

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
