import { dbc } from "@/lib/db/mongo";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const appointmentsColl = await dbc("aviso_appointments");
    const historyColl = await dbc("aviso_history");

    // Build appointment search filter
    const filter: any = {};

    if (q) {
      const regex = { $regex: q, $options: "i" };
      filter.$or = [
        { plate: regex },
        { driver_name: regex },
        { company_name: regex },
        { carrier_name: regex },
        { driver_phone: regex },
        { company_phone: regex },
      ];
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from.slice(0, 10);
      if (to) filter.date.$lte = to.slice(0, 10);
    }

    const appointments = await appointmentsColl
      .find(filter)
      .sort({ date: -1, window_start: 1 })
      .limit(500)
      .toArray();

    // Build history search filter - search within snapshots
    const historyFilter: any = {};
    if (q) {
      const regex = { $regex: q, $options: "i" };
      historyFilter.$or = [
        { "snapshot.plate": regex },
        { "snapshot.driver_name": regex },
        { "snapshot.company_name": regex },
        { "snapshot.carrier_name": regex },
        { "snapshot.driver_phone": regex },
        { "snapshot.company_phone": regex },
      ];
    }
    if (from || to) {
      historyFilter.changed_at = {};
      if (from) {
        historyFilter.changed_at.$gte =
          from.length > 10
            ? new Date(from.replace(" ", "T") + ":00")
            : new Date(`${from}T00:00:00`);
      }
      if (to) {
        historyFilter.changed_at.$lte =
          to.length > 10
            ? new Date(to.replace(" ", "T") + ":59")
            : new Date(`${to}T23:59:59`);
      }
    }

    const history = await historyColl
      .find(historyFilter)
      .sort({ changed_at: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        ...a,
        _id: a._id.toString(),
      })),
      history: history.map((h) => ({
        ...h,
        _id: h._id.toString(),
        appointment_id: h.appointment_id.toString(),
      })),
    });
  } catch (error) {
    console.error("api/aviso/history:", error);
    return NextResponse.json(
      { error: "aviso history api error" },
      { status: 503 },
    );
  }
}
