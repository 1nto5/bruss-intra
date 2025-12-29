'use server';

import { PositionZodType } from './lib/zod';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { revalidateTag } from 'next/cache';
import { generateExcelBuffer } from './lib/excel-export';
import { redirect } from 'next/navigation';

export async function revalidateCards() {
  revalidateTag('inventory-cards', { expire: 0 });
}

export async function revalidateCardPositions() {
  revalidateTag('inventory-card-positions', { expire: 0 });
}

export async function revalidatePositions() {
  revalidateTag('inventory-positions', { expire: 0 });
}

export async function revalidateAll() {
  revalidateTag('inventory-cards', { expire: 0 });
  revalidateTag('inventory-card-positions', { expire: 0 });
  revalidateTag('inventory-positions', { expire: 0 });
}

export async function redirectToCardPositions(lang: string, cardNumber: string) {
  redirect(`/${lang}/inventory/${cardNumber}`);
}

export async function updatePosition(
  identifier: string,
  data: PositionZodType,
) {
  try {
    const session = await auth();
    const roles = session?.user?.roles ?? [];
    if (!session || (!roles.includes('inventory-approve') && !roles.includes('admin'))) {
      return { error: 'unauthorized' };
    }
    const collection = await dbc('inventory_cards');
    const [card, position] = identifier.split('/');

    // Get card to check warehouse
    const cardData = await collection.findOne({ number: Number(card) });
    if (!cardData) {
      return { error: 'card not found' };
    }

    // Get warehouse config for validation
    const configColl = await dbc('inventory_configs');
    const warehouseConfig = await configColl.findOne({
      config: 'warehouse_options',
    });

    const warehouseOption = warehouseConfig?.options?.find(
      (opt: any) => opt.value === cardData.warehouse,
    );

    // Validate BIN requirement
    if (warehouseOption?.has_bins && !data.bin) {
      return { error: 'bin required' };
    }

    // Validate BIN not allowed
    if (!warehouseOption?.has_bins && data.bin) {
      return { error: 'bin not allowed' };
    }

    const articlesCollection = await dbc('inventory_articles');
    const article = await articlesCollection.findOne({
      number: data.articleNumber,
    });
    if (!article) {
      return { error: 'article not found' };
    }

    const positionData: any = {
      time: new Date(),
      articleNumber: article.number,
      articleName: article.name,
      quantity: data.quantity,
      wip: data.wip,
      bin: data.bin || '',
      deliveryDate: data.deliveryDate,
      comment: data.comment?.toLowerCase(),
      approver: data.approved ? session.user?.email : '',
      approvedAt: data.approved ? new Date() : null,
    };

    // WIP validation for S900 sector
    if (data.wip) {
      if (cardData.sector === 'S900') {
        return { error: 'wip not allowed' };
      }
    }

    const res = await collection.updateOne(
      {
        'number': Number(card),
        'positions.position': Number(position),
      },
      {
        $set: {
          'positions.$.time': positionData.time,
          'positions.$.articleNumber': positionData.articleNumber,
          'positions.$.articleName': positionData.articleName,
          'positions.$.quantity': positionData.quantity,
          'positions.$.wip': positionData.wip,
          'positions.$.bin': positionData.bin,
          'positions.$.deliveryDate': positionData.deliveryDate,
          'positions.$.comment': positionData.comment,
          'positions.$.approver': positionData.approver,
          'positions.$.approvedAt': positionData.approvedAt,
        },
      },
    );

    if (res.matchedCount > 0) {
      revalidateTag('inventory-card-positions', { expire: 0 });
      revalidateTag('inventory-cards', { expire: 0 });
      revalidateTag('inventory-positions', { expire: 0 });
      return { success: 'updated' };
    } else {
      return { error: 'not updated' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'updatePosition server action error' };
  }
}

export async function findBins(search: string) {
  try {
    const coll = await dbc('inventory_bin_options');

    const normalizedSearch = search
      .toLowerCase()
      .trim()
      .replace(/-/g, ''); // Strip dashes for flexible matching

    if (!normalizedSearch) {
      return { error: 'no bins' };
    }

    // Escape regex special characters
    const escapedSearch = normalizedSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    // Insert -? between chars for hyphen-agnostic matching
    const flexiblePattern = escapedSearch.split('').join('-?');

    const results = await coll
      .find({
        value: { $regex: flexiblePattern, $options: 'i' },
      })
      .limit(11) // Get 11 to detect "too many"
      .toArray();

    if (results.length === 0) {
      return { error: 'no bins' };
    }

    if (results.length > 10) {
      return { error: 'too many bins' };
    }

    const sanitizedResults = results.map(({ _id, ...rest }) => rest);
    return { success: sanitizedResults };
  } catch (error) {
    console.error(error);
    return { error: 'findBins server action error' };
  }
}

export async function getBinsForWarehouse(warehouse: string, search: string) {
  try {
    // Get warehouse config to find bin_warehouse_id
    const configColl = await dbc('inventory_configs');
    const warehouseConfig = await configColl.findOne({
      config: 'warehouse_options',
    });

    const warehouseOption = warehouseConfig?.options?.find(
      (opt: any) => opt.value === warehouse,
    );

    if (!warehouseOption?.has_bins || !warehouseOption?.bin_warehouse_id) {
      return { error: 'warehouse has no bins' };
    }

    const coll = await dbc('inventory_bin_options');

    const normalizedSearch = search
      .toLowerCase()
      .trim()
      .replace(/-/g, ''); // Strip dashes for flexible matching

    if (!normalizedSearch) {
      return { error: 'no bins' };
    }

    const escapedSearch = normalizedSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    // Insert -? between chars for hyphen-agnostic matching
    const flexiblePattern = escapedSearch.split('').join('-?');

    const results = await coll
      .find({
        warehouse_id: warehouseOption.bin_warehouse_id,
        value: { $regex: flexiblePattern, $options: 'i' },
      })
      .limit(11)
      .toArray();

    if (results.length === 0) {
      return { error: 'no bins' };
    }

    if (results.length > 10) {
      return { error: 'too many bins' };
    }

    const sanitizedResults = results.map(({ _id, ...rest }) => rest);
    return { success: sanitizedResults };
  } catch (error) {
    console.error(error);
    return { error: 'getBinsForWarehouse server action error' };
  }
}

export async function getSectorsForWarehouse(warehouse: string) {
  try {
    const collection = await dbc('inventory_configs');

    const warehouseConfig = await collection.findOne({
      config: 'warehouse_options',
    });

    const warehouseOption = warehouseConfig?.options?.find(
      (opt: any) => opt.value === warehouse,
    );

    if (!warehouseOption?.has_sectors) {
      return { error: 'warehouse has no sectors' };
    }

    // Use sector_config if specified, otherwise fallback to 'sector_options'
    const sectorConfigName = warehouseOption.sector_config || 'sector_options';

    const sectorConfig = await collection.findOne({
      config: sectorConfigName,
    });

    if (!sectorConfig || !sectorConfig.options) {
      return { error: 'sector config not found' };
    }

    const sorted = sectorConfig.options
      .filter((opt: any) => opt.active !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((opt: any) => ({ value: opt.value, label: opt.label }));

    return { success: sorted };
  } catch (error) {
    console.error('getSectorsForWarehouse error:', error);
    return { error: 'database error' };
  }
}

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
