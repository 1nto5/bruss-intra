import { dbc } from '@/lib/db/mongo';
import { COLLECTIONS, CERTIFICATION_TYPE_LABELS } from './constants';
import type { ConfigValue } from './types';

export async function fetchCertificationTypes(): Promise<ConfigValue[]> {
  const coll = await dbc(COLLECTIONS.competencyMatrixConfigs);
  const doc = await coll.findOne({ key: 'certification-types' });

  if (!doc) {
    // Auto-seed from hardcoded values on first access
    const seedValues: ConfigValue[] = Object.entries(
      CERTIFICATION_TYPE_LABELS,
    ).map(([slug, name]) => ({ slug, name, active: true }));

    await coll.insertOne({
      key: 'certification-types',
      values: seedValues,
      updatedAt: new Date(),
      updatedBy: 'system-seed',
    });

    return seedValues;
  }

  return doc.values as ConfigValue[];
}
