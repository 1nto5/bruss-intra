import { dbc } from "@/lib/db/mongo";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const collection = await dbc("oven_fault_configs");
    const configs = await collection.find({}).toArray();

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Fault configs API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fault configurations" },
      { status: 500 },
    );
  }
}
