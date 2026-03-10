import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // Check if ID is provided
  if (!searchParams.has("id")) {
    return NextResponse.json(
      { error: "ID parameter is required" },
      { status: 400 },
    );
  }

  try {
    const id = searchParams.get("id")!;
    const query = { _id: new ObjectId(id) };

    const coll = await dbc("production_overtime");
    const document = await coll.findOne(query);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("api/production-overtime/request: " + error);
    return NextResponse.json(
      { error: "production-overtime/request api" },
      { status: 400 },
    );
  }
}
