import { dbc } from "@/lib/db/mongo";
import { NextResponse, type NextRequest } from "next/server";

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = "force-dynamic";
// 'auto' | 'force-dynamic' | 'error' | 'force-static'

export async function GET(req: NextRequest) {
  try {
    const coll = await dbc("dmcheck_configs");

    const scans = await coll.find().toArray();
    return new NextResponse(JSON.stringify(scans));
  } catch (error) {
    console.error("api/dmcheck-mgmt/article-configs: " + error);
    return NextResponse.json(
      { error: "dmcheck-mgmt/article-configs api" },
      { status: 503 },
    );
  }
}
