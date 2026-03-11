import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "invalid or missing id" },
        { status: 400 },
      );
    }

    const appointmentsColl = await dbc("aviso_appointments");
    const historyColl = await dbc("aviso_history");

    const appointment = await appointmentsColl.findOne({
      _id: new ObjectId(id),
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "appointment not found" },
        { status: 404 },
      );
    }

    const history = await historyColl
      .find({ appointment_id: new ObjectId(id) })
      .sort({ changed_at: -1 })
      .toArray();

    return NextResponse.json({
      appointment: { ...appointment, _id: appointment._id.toString() },
      history: history.map((h) => ({
        ...h,
        _id: h._id.toString(),
        appointment_id: h.appointment_id.toString(),
      })),
    });
  } catch (error) {
    console.error("api/aviso/appointment:", error);
    return NextResponse.json(
      { error: "aviso appointment api error" },
      { status: 503 },
    );
  }
}
