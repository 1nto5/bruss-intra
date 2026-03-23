import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const type = searchParams.get("type");
    const quarry = searchParams.get("quarry");

    const collection = await dbc("wh_corrections");

    // Build base match filter (exclude draft/cancelled from stats)
    const matchFilter: Record<string, unknown> = {
      status: { $nin: ["draft", "cancelled"] },
    };

    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) {
        (matchFilter.createdAt as Record<string, unknown>).$gte = new Date(
          dateFrom,
        );
      }
      if (dateTo) {
        (matchFilter.createdAt as Record<string, unknown>).$lte = new Date(
          dateTo,
        );
      }
    }

    if (type) {
      matchFilter.type = { $in: type.split(",") };
    }

    if (quarry) {
      matchFilter["items.quarry"] = { $in: quarry.split(",") };
    }

    const [
      summary,
      byType,
      byQuarry,
      topArticles,
      byUser,
      rejections,
      monthlyTrend,
    ] = await Promise.all([
      // 1. Summary totals
      collection
        .aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              totalValue: { $sum: "$totalValue" },
              avgApprovalTimeMs: {
                $avg: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$submittedAt", null] },
                        { $ne: ["$completedAt", null] },
                      ],
                    },
                    { $subtract: ["$completedAt", "$submittedAt"] },
                    null,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),

      // 2. By type
      collection
        .aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              value: { $sum: "$totalValue" },
            },
          },
          { $project: { type: "$_id", count: 1, value: 1, _id: 0 } },
        ])
        .toArray(),

      // 3. By quarry
      collection
        .aggregate([
          { $match: matchFilter },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.quarry",
              totalQuantity: { $sum: "$items.quantity" },
              totalValue: { $sum: "$items.value" },
            },
          },
          {
            $project: {
              quarry: { $ifNull: ["$_id", "N/A"] },
              totalQuantity: 1,
              totalValue: 1,
              _id: 0,
            },
          },
          { $sort: { totalValue: -1 } },
        ])
        .toArray(),

      // 4. Top articles
      collection
        .aggregate([
          { $match: matchFilter },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.articleNumber",
              articleName: { $first: "$items.articleName" },
              quantity: { $sum: "$items.quantity" },
              value: { $sum: "$items.value" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              articleNumber: "$_id",
              articleName: 1,
              quantity: 1,
              value: 1,
              count: 1,
              _id: 0,
            },
          },
          { $sort: { value: -1 } },
          { $limit: 20 },
        ])
        .toArray(),

      // 5. By user
      collection
        .aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: "$createdBy",
              count: { $sum: 1 },
              value: { $sum: "$totalValue" },
            },
          },
          { $project: { user: "$_id", count: 1, value: 1, _id: 0 } },
          { $sort: { value: -1 } },
        ])
        .toArray(),

      // 6. Rejections
      collection
        .aggregate([
          { $match: { ...matchFilter, rejectedBy: { $exists: true } } },
          {
            $group: {
              _id: "$rejectedBy",
              count: { $sum: 1 },
            },
          },
          { $project: { rejectedBy: "$_id", count: 1, _id: 0 } },
          { $sort: { count: -1 } },
        ])
        .toArray(),

      // 7. Monthly trend
      collection
        .aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
              value: { $sum: "$totalValue" },
            },
          },
          {
            $project: {
              year: "$_id.year",
              month: "$_id.month",
              count: 1,
              value: 1,
              _id: 0,
            },
          },
          { $sort: { year: 1, month: 1 } },
        ])
        .toArray(),
    ]);

    const summaryData = summary[0] || {
      totalCount: 0,
      totalValue: 0,
      avgApprovalTimeMs: 0,
    };

    return NextResponse.json({
      summary: {
        totalCount: summaryData.totalCount,
        totalValue: summaryData.totalValue,
        avgApprovalTimeHours: summaryData.avgApprovalTimeMs
          ? Math.round(
              (summaryData.avgApprovalTimeMs / (1000 * 60 * 60)) * 10,
            ) / 10
          : 0,
      },
      byType,
      byQuarry,
      topArticles,
      byUser,
      rejections,
      monthlyTrend,
    });
  } catch (error) {
    console.error(
      "GET /api/warehouse-corrections/statistics error:",
      error,
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
