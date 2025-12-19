'use server';

import { dbc } from '@/lib/db/mongo';

export type InventoryPositionForEdit = {
  cardNumber: number;
  position: number;
  identifier: string;
  articleNumber: string;
  articleName: string;
  quantity: number;
  wip: boolean;
  comment: string;
  approver: string;
  approvedAt: string;
  warehouse: string;
  sector: string;
  bin: string;
  deliveryDate: Date | null;
};

export async function getInventoryPosition(
  cardNumber: number,
  positionNumber: number,
): Promise<InventoryPositionForEdit | null> {
  try {
    const collection = await dbc('inventory_cards');
    const card = await collection.findOne({ number: cardNumber });

    if (!card) return null;

    const position = card.positions?.find(
      (pos: any) => pos.position === positionNumber,
    );

    if (!position) return null;

    return {
      cardNumber,
      position: position.position,
      identifier: `${cardNumber}/${positionNumber}`,
      articleNumber: position.articleNumber,
      articleName: position.articleName,
      quantity: position.quantity,
      wip: position.wip || false,
      comment: position.comment || '',
      approver: position.approver || '',
      approvedAt: position.approvedAt || '',
      warehouse: card.warehouse || '',
      sector: card.sector || '',
      bin: position.bin || '',
      deliveryDate: position.deliveryDate || null,
    };
  } catch (error) {
    console.error('getInventoryPosition error:', error);
    return null;
  }
}
