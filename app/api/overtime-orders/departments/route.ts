import { dbc } from '@/lib/db/mongo';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coll = await dbc('department_configs');
    const departments = await coll
      .find({ showInOvertimeOrders: true })
      .toArray();
    
    // Return all language variants for client-side translation selection
    const transformedDepartments = departments.map(dept => ({
      _id: dept._id,
      value: dept.value,
      name: dept.name,
      namePl: dept.namePl,
      nameDe: dept.nameDe,
      hourlyRate: dept.hourlyRate,
      currency: dept.currency
    }));
    
    return NextResponse.json(transformedDepartments);
  } catch (error) {
    console.error('api/overtime-orders/departments: ' + error);
    return NextResponse.json(
      { error: 'departments api error' },
      { status: 503 },
    );
  }
}