import { dbc } from "@/lib/db/mongo";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  let year = yearParam ? parseInt(yearParam, 10) : NaN;
  let month = monthParam ? parseInt(monthParam, 10) : NaN;

  const now = new Date();
  if (isNaN(year)) {
    year = now.getFullYear();
  }
  if (isNaN(month)) {
    month = now.getMonth() + 1;
  }

  // Ustalenie zakresu dat dla danego miesiąca
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1); // początek kolejnego miesiąca

  try {
    const coll = await dbc("projects");
    const entries = await coll
      .find({ date: { $gte: startDate, $lt: endDate } })
      .sort({ date: -1 })
      .toArray();
    return NextResponse.json(entries);
  } catch (error) {
    console.error("api/projects/summary: " + error);
    return NextResponse.json(
      { error: "projects/summary api" },
      { status: 503 },
    );
  }
}
