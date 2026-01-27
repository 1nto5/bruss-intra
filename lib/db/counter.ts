import { dbc } from './mongo';

/**
 * Get the next sequence value for a given counter using atomic increment.
 * Uses MongoDB's findOneAndUpdate with $inc for race-condition-safe ID generation.
 *
 * @param sequenceName - The name of the sequence (e.g., 'individual_overtime_orders')
 * @param year - The year for which to generate the sequence
 * @returns The next sequence number
 */
export async function getNextSequenceValue(
  sequenceName: string,
  year: number,
): Promise<number> {
  const counters = await dbc('counters');
  const result = await counters.findOneAndUpdate(
    { _id: `${sequenceName}_${year}` } as any,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return result!.seq;
}
