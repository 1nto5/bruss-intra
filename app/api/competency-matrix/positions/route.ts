export const revalidate = 28800;

import { NextRequest, NextResponse } from "next/server";
import { dbc } from "@/lib/db/mongo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get("department");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const coll = await dbc("competency_matrix_positions");

    const filter: Record<string, unknown> = {};

    if (department) {
      filter.department = department;
    }

    if (active !== null && active !== "") {
      filter.active = active === "true";
    }

    if (search) {
      filter.$or = [
        { "name.pl": { $regex: search, $options: "i" } },
        { "name.de": { $regex: search, $options: "i" } },
        { "name.en": { $regex: search, $options: "i" } },
      ];
    }

    const positions = await coll
      .find(filter)
      .sort({ department: 1, "name.pl": 1 })
      .toArray();

    return NextResponse.json(positions);
  } catch (error) {
    console.error("GET /api/competency-matrix/positions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
