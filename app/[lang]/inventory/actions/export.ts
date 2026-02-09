'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { generateExcelBuffer } from '../lib/excel-export';

export async function exportInventoryPositionsToExcel() {
  try {
    const session = await auth();
    const roles = session?.user?.roles ?? [];
    if (!session || (!roles.includes('inventory-approve') && !roles.includes('admin'))) {
      return { error: 'unauthorized' };
    }

    const collection = await dbc('inventory_cards');
    const inventoryCards = await collection.find().toArray();

    const exportData = inventoryCards.map((card) => ({
      card: {
        number: card.number,
        warehouse: card.warehouse,
        sector: card.sector,
        creators: card.creators,
      },
      positions: card.positions || [],
    }));

    const buffer = await generateExcelBuffer(exportData);

    return {
      success: true,
      data: buffer.toString('base64'),
      filename: `inventory_positions_${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  } catch (error) {
    console.error('Export error:', error);
    return { error: 'export failed' };
  }
}
