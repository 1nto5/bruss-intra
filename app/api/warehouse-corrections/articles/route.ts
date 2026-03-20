import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    const collection = await dbc("wh_corrections_articles");

    let filter: Record<string, unknown> = { active: true };
    if (q && q.length >= 2) {
      filter = {
        ...filter,
        $or: [
          { articleNumber: { $regex: q, $options: "i" } },
          { articleName: { $regex: q, $options: "i" } },
        ],
      };
    }

    const articles = await collection
      .find(filter)
      .sort({ articleNumber: 1 })
      .limit(50)
      .toArray();

    return NextResponse.json(articles);
  } catch (error) {
    console.error("GET /api/warehouse-corrections/articles error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
