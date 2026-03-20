import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const correctionNumber = searchParams.get("correctionNumber");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const createdBy = searchParams.get("createdBy");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const article = searchParams.get("article");
    const quarry = searchParams.get("quarry");
    const sourceWarehouse = searchParams.get("sourceWarehouse");
    const targetWarehouse = searchParams.get("targetWarehouse");
    const userEmail = searchParams.get("userEmail");

    const collection = await dbc("wh_corrections");

    const filter: Record<string, unknown> = {};

    if (correctionNumber) {
      filter.correctionNumber = { $regex: correctionNumber, $options: "i" };
    }

    if (status) {
      const statuses = status.split(",");
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (type) {
      const types = type.split(",");
      filter.type = types.length === 1 ? types[0] : { $in: types };
    }

    if (createdBy) {
      const creators = createdBy.split(",");
      filter.createdBy =
        creators.length === 1 ? creators[0] : { $in: creators };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(dateTo);
      }
    }

    if (article) {
      const articles = article.split(",");
      filter["items.articleNumber"] =
        articles.length === 1 ? articles[0] : { $in: articles };
    }

    if (quarry) {
      const quarries = quarry.split(",");
      filter["items.quarry"] =
        quarries.length === 1 ? quarries[0] : { $in: quarries };
    }

    if (sourceWarehouse) {
      const sources = sourceWarehouse.split(",");
      filter.sourceWarehouse =
        sources.length === 1 ? sources[0] : { $in: sources };
    }

    if (targetWarehouse) {
      const targets = targetWarehouse.split(",");
      filter.targetWarehouse =
        targets.length === 1 ? targets[0] : { $in: targets };
    }

    // Non-admin users only see their own drafts + all non-draft corrections
    if (userEmail) {
      filter.$and = [
        {
          $or: [
            { status: { $ne: "draft" } },
            { status: "draft", createdBy: userEmail },
          ],
        },
      ];
    }

    const corrections = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    return NextResponse.json(corrections);
  } catch (error) {
    console.error("GET /api/warehouse-corrections error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
