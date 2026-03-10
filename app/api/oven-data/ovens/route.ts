import { dbc } from "@/lib/db/mongo";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const collection = await dbc("oven_processes");

    // Get distinct oven names - using aggregate instead of distinct for better compatibility
    const result = await collection
      .aggregate([{ $group: { _id: "$oven" } }, { $sort: { _id: 1 } }])
      .toArray();

    const ovens = result.map((item) => item._id).filter(Boolean);

    return NextResponse.json(ovens);
  } catch (error) {
    console.error("Ovens API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ovens" },
      { status: 500 },
    );
  }
}
