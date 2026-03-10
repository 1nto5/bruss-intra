export const revalidate = 3600;

import { NextRequest, NextResponse } from "next/server";
import { dbc } from "@/lib/db/mongo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeIdentifier = searchParams.get("employeeIdentifier");
    const expiringSoon = searchParams.get("expiringSoon");

    const coll = await dbc("competency_matrix_employee_certifications");

    const filter: Record<string, unknown> = {};

    if (employeeIdentifier) {
      filter.employeeIdentifier = employeeIdentifier;
    }

    if (expiringSoon === "true") {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      filter.expirationDate = { $lte: thirtyDaysFromNow, $gte: now };
    }

    const certifications = await coll
      .find(filter)
      .sort({ expirationDate: 1 })
      .toArray();

    return NextResponse.json(certifications);
  } catch (error) {
    console.error("GET /api/competency-matrix/certifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
