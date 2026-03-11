import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = "force-dynamic";
// 'auto' | 'force-dynamic' | 'error' | 'force-static'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Please provide valid id" },
      { status: 400 },
    );
  }

  try {
    const collection = await dbc("deviations");
    const response = await collection.findOne({ _id: new ObjectId(id) });

    if (!response) {
      return NextResponse.json(
        { error: "Deviation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
