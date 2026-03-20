import { dbc } from "@/lib/db/mongo";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const collection = await dbc("wh_corrections_reasons");
    const reasons = await collection
      .find({ active: true })
      .sort({ value: 1 })
      .toArray();

    return NextResponse.json(reasons);
  } catch (error) {
    console.error("GET /api/warehouse-corrections/reasons error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
