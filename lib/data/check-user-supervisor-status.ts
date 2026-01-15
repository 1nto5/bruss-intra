import { dbc } from '@/lib/db/mongo';

export async function checkIfUserIsSupervisor(
  userEmail: string,
): Promise<boolean> {
  try {
    const coll = await dbc('overtime_submissions');
    const count = await coll.countDocuments({ supervisor: userEmail });
    return count > 0;
  } catch (error) {
    console.error('checkIfUserIsSupervisor error:', error);
    return false;
  }
}
