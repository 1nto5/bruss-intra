import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roles = searchParams.get("roles");

    if (!roles) {
      return NextResponse.json(
        { error: "roles parameter required" },
        { status: 400 },
      );
    }

    const userRoles = roles.split(",");
    const collection = await dbc("wh_corrections_approvals");

    // Find pending approvals matching user's roles
    const pendingApprovals = await collection
      .find({
        status: "pending",
        role: { $in: userRoles },
      })
      .sort({ createdAt: 1 })
      .toArray();

    // Get unique correction IDs
    const correctionIds = [
      ...new Set(pendingApprovals.map((a) => a.correctionId.toString())),
    ];

    if (correctionIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch the corrections for those IDs
    const correctionsCollection = await dbc("wh_corrections");
    const { ObjectId } = await import("mongodb");
    const corrections = await correctionsCollection
      .find({
        _id: { $in: correctionIds.map((id) => new ObjectId(id)) },
        status: "in-approval",
      })
      .sort({ submittedAt: 1 })
      .toArray();

    // Attach pending approvals to each correction
    const result = corrections.map((correction) => ({
      ...correction,
      pendingApprovals: pendingApprovals.filter(
        (a) => a.correctionId.toString() === correction._id.toString(),
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/warehouse-corrections/approvals error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
