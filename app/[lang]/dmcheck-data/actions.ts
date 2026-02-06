'use server';

import type { PositionZodType } from '@/app/[lang]/inventory/lib/zod';
import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { revalidateTag } from 'next/cache';
// import { redirect } from 'next/navigation';

export async function revalidateDmcheckTableData() {
  revalidateTag('dmcheck-data-dmc', { expire: 0 });
}

export async function revalidateDmcheckDefectsData() {
  revalidateTag('dmcheck-data-dmc', { expire: 0 });
}

export async function updatePosition(
  identifier: string,
  data: PositionZodType,
) {
  try {
    const session = await auth();
    if (
      !session ||
      !(session.user?.roles ?? []).includes('inventory-approve')
    ) {
      return { error: 'unauthorized' };
    }
    const collection = await dbc('inventory_cards');
    const [card, position] = identifier.split('/');
    const articlesCollection = await dbc('inventory_articles');
    const article = await articlesCollection.findOne({
      number: data.articleNumber,
    });
    if (!article) {
      return { error: 'article not found' };
    }

    console.log(session.user?.email);

    const positionData: any = {
      time: new Date(),
      articleNumber: article.number,
      articleName: article.name,
      quantity: data.quantity,
      wip: data.wip,
      comment: data.comment,
      approver: data.approved ? session.user?.email : '',
    };

    if (data.wip) {
      const cardData = await collection.findOne({ number: Number(card) });
      if (cardData && cardData.sector === 'S900') {
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
          'positions.$.comment': positionData.comment,
          'positions.$.approver': positionData.approver,
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
