import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid correction ID" },
        { status: 400 },
      );
    }

    const correctionId = new ObjectId(id);

    const [corrections, approvals, comments, auditLog] = await Promise.all([
      dbc("wh_corrections").then((c) =>
        c.findOne({ _id: correctionId }),
      ),
      dbc("wh_corrections_approvals").then((c) =>
        c
          .find({ correctionId: correctionId })
          .sort({ createdAt: 1 })
          .toArray(),
      ),
      dbc("wh_corrections_comments").then((c) =>
        c
          .find({ correctionId: correctionId })
          .sort({ createdAt: 1 })
          .toArray(),
      ),
      dbc("wh_corrections_audit_log").then((c) =>
        c
          .find({ correctionId: correctionId })
          .sort({ performedAt: -1 })
          .toArray(),
      ),
    ]);

    if (!corrections) {
      return NextResponse.json(
        { error: "Correction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...corrections,
      approvals,
      comments,
      auditLog,
    });
  } catch (error) {
    console.error("GET /api/warehouse-corrections/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
