import { dbc } from "@/lib/db/mongo";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coll = await dbc("failures_lv_options");
    const failures = await coll.find().toArray();
    return new NextResponse(JSON.stringify(failures));
  } catch (error) {
    console.error("api/failures/lv/options: " + error);
    return NextResponse.json(
      { error: "failures/lv/options api" },
      { status: 503 },
    );
  }
}
