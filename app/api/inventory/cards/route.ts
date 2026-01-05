import { dbc } from '@/lib/db/mongo';
import { NextResponse } from 'next/server';

// Cache for 60 seconds (was force-dynamic before)
export const revalidate = 60;

export async function GET() {
  try {
    const coll = await dbc('inventory_cards');
    const cards = await coll.find({}).sort({ _id: -1 }).limit(10000).toArray();
    return NextResponse.json(cards);
  } catch (error) {
    console.error('api/inventory/cards: ' + error);
    return NextResponse.json({ error: 'inventory/cards api' }, { status: 503 });
  }
}
