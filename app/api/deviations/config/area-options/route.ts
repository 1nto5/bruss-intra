import { dbc } from '@/lib/db/mongo';
import { NextResponse } from 'next/server';

// Config rarely changes - cache for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    const coll = await dbc('deviations_configs');
    const configDoc = await coll.findOne({ config: 'area_options' });
    return new NextResponse(JSON.stringify(configDoc?.options));
  } catch (error) {
    console.error('api/deviations/area-options: ' + error);
    return NextResponse.json({ error: 'area-options api' }, { status: 503 });
  }
}
