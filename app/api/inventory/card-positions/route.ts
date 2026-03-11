import { dbc } from "@/lib/db/mongo";
import { NextResponse, type NextRequest } from "next/server";

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = "force-dynamic";
// 'auto' | 'force-dynamic' | 'error' | 'force-static'

export async function GET(req: NextRequest) {
  try {
    const cardNumber = Number(req.nextUrl.searchParams.get("card-number"));
    const coll = await dbc("inventory_cards");
    const card = await coll
      .find({ number: cardNumber })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    const positions = card.flatMap((card) => card.positions || []);

    return new NextResponse(
      JSON.stringify({
        cardWarehouse: card[0]?.warehouse,
        cardSector: card[0]?.sector,
        cardCreators: card[0]?.creators,
        positions,
      }),
    );
  } catch (error) {
    console.error("api/inventory/card-positions: " + error);
    return NextResponse.json(
      { error: "inventory/card-positions api" },
      { status: 503 },
    );
  }
}
