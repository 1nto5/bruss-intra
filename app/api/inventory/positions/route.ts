import { dbc } from '@/lib/db/mongo';
import { NextResponse, type NextRequest } from 'next/server';

// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
// https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation
// https://nextjs.org/docs/app/api-reference/functions/revalidateTag
export const dynamic = 'force-dynamic';
// 'auto' | 'force-dynamic' | 'error' | 'force-static'
export async function GET(req: NextRequest) {
  try {
    const coll = await dbc('inventory_cards');
    const cards = await coll.find({}).sort({ _id: -1 }).toArray();

    const positions = cards.flatMap((card) =>
      (card.positions || []).map((position: Record<string, unknown>) => ({
        ...position,
        warehouse: card.warehouse,
        sector: card.sector,
      })),
    );

    return new NextResponse(
      JSON.stringify({
        positions,
      }),
    );
  } catch (error) {
    console.error('api/inventory/card-positions: ' + error);
    return NextResponse.json(
      { error: 'inventory/positions api' },
      { status: 503 },
    );
  }
}
