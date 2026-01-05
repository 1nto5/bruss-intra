import { dbc } from '@/lib/db/mongo';
import { NextResponse } from 'next/server';

// Config rarely changes - cache for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    const coll = await dbc('deviations_configs');
    const configDoc = await coll.findOne({ config: 'reason_options' });
    return new NextResponse(JSON.stringify(configDoc?.options));
  } catch (error) {
    console.error('api/deviations/reason-options: ' + error);
    return NextResponse.json({ error: 'reason-options api' }, { status: 503 });
  }
}
