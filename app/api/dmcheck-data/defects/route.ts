import { dbc } from "@/lib/db/mongo";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const coll = await dbc("dmcheck_defects");

    const defects = await coll.find().sort({ order: 1 }).toArray();
    return new NextResponse(JSON.stringify(defects));
  } catch (error) {
    console.error("api/dmcheck-data/defects: " + error);
    return NextResponse.json(
      { error: "dmcheck-data/defects api" },
      { status: 503 },
    );
  }
}
