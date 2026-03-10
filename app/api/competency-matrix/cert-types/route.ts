export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { dbc } from "@/lib/db/mongo";
import { CERTIFICATION_TYPE_LABELS } from "@/app/[lang]/competency-matrix/lib/constants";
import type { ConfigValue } from "@/app/[lang]/competency-matrix/lib/types";

export async function GET() {
  try {
    const coll = await dbc("competency_matrix_configs");
    const doc = await coll.findOne({ key: "certification-types" });

    if (!doc) {
      // Auto-seed from hardcoded values on first access
      const seedValues: ConfigValue[] = Object.entries(
        CERTIFICATION_TYPE_LABELS,
      ).map(([slug, name]) => ({ slug, name }));

      await coll.insertOne({
        key: "certification-types",
        values: seedValues,
        updatedAt: new Date(),
        updatedBy: "system-seed",
      });

      return NextResponse.json(seedValues);
    }

    return NextResponse.json(doc.values ?? []);
  } catch (error) {
    console.error("GET /api/competency-matrix/cert-types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
