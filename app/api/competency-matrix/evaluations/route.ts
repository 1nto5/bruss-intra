export const revalidate = 60;

import { NextRequest, NextResponse } from "next/server";
import { dbc } from "@/lib/db/mongo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeIdentifier = searchParams.get("employeeIdentifier");

    const coll = await dbc("competency_matrix_evaluations");

    const filter: Record<string, unknown> = {};

    if (employeeIdentifier) {
      filter.employeeIdentifier = employeeIdentifier;
    }

    const evaluations = await coll
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("GET /api/competency-matrix/evaluations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
