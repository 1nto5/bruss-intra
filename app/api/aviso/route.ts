import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date") || "";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date parameter" },
        { status: 400 },
      );
    }

    const coll = await dbc("aviso_appointments");
    const appointments = await coll
      .find({ date })
      .sort({ window_start: 1 })
      .toArray();

    // Convert ObjectId to string
    const result = appointments.map((a) => ({
      ...a,
      _id: a._id.toString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("api/aviso:", error);
    return NextResponse.json({ error: "aviso api error" }, { status: 503 });
  }
}
