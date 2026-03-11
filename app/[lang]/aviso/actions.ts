"use server";

import { auth } from "@/lib/auth";
import { dbc } from "@/lib/db/mongo";
import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import { appointmentSchema } from "./lib/zod";
import { hasAdminAccess, hasProcessAccess } from "./lib/permissions";
import { formatTimeHm } from "./lib/time-utils";
import { generateExcelBuffer, generateCsvString } from "./lib/export-utils";

async function getSessionWithRoles() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session;
}

async function writeHistory(
  appointmentId: ObjectId | string,
  action: string,
  userEmail: string,
  snapshot: Record<string, any>,
) {
  const coll = await dbc("aviso_history");
  await coll.insertOne({
    appointment_id: new ObjectId(appointmentId),
    action,
    changed_at: new Date(),
    changed_by: userEmail,
    snapshot,
  });
}

export async function createAppointment(formData: Record<string, any>) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasAdminAccess(session.user.roles)) return { error: "unauthorized" };

  const parsed = appointmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "validation failed", issues: parsed.error.issues };
  }

  const data = parsed.data;
  const now = new Date();
  const doc = {
    ...data,
    gate_entry_time: "",
    gate_exit_time: "",
    created_at: now,
    updated_at: now,
    created_by: session.user.email!,
    updated_by: session.user.email!,
  };

  const coll = await dbc("aviso_appointments");
  const result = await coll.insertOne(doc);
  await writeHistory(result.insertedId, "create", session.user.email!, doc);
  revalidateTag("aviso-appointments", { expire: 0 });

  return { success: "created" };
}

export async function updateAppointment(
  id: string,
  formData: Record<string, any>,
) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasAdminAccess(session.user.roles)) return { error: "unauthorized" };

  const parsed = appointmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "validation failed", issues: parsed.error.issues };
  }

  const coll = await dbc("aviso_appointments");
  const existing = await coll.findOne({ _id: new ObjectId(id) });
  if (!existing) return { error: "not found" };

  const data = parsed.data;
  const now = new Date();
  const update = {
    ...data,
    gate_entry_time: existing.gate_entry_time || "",
    gate_exit_time: existing.gate_exit_time || "",
    updated_at: now,
    updated_by: session.user.email!,
  };

  await coll.updateOne({ _id: new ObjectId(id) }, { $set: update });
  await writeHistory(id, "update", session.user.email!, {
    ...existing,
    ...update,
    _id: id,
  });
  revalidateTag("aviso-appointments", { expire: 0 });

  return { success: "updated" };
}

export async function deleteAppointment(id: string) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasAdminAccess(session.user.roles)) return { error: "unauthorized" };

  const coll = await dbc("aviso_appointments");
  const existing = await coll.findOne({ _id: new ObjectId(id) });
  if (!existing) return { error: "not found" };

  await coll.deleteOne({ _id: new ObjectId(id) });
  await writeHistory(id, "delete", session.user.email!, {
    ...existing,
    _id: id.toString(),
  });
  revalidateTag("aviso-appointments", { expire: 0 });

  return { success: "deleted" };
}

export async function recordGateEntry(id: string, time?: string) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasProcessAccess(session.user.roles)) return { error: "unauthorized" };

  const coll = await dbc("aviso_appointments");
  const existing = await coll.findOne({ _id: new ObjectId(id) });
  if (!existing) return { error: "not found" };

  const entryTime = time || formatTimeHm();
  const now = new Date();
  await coll.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        gate_entry_time: entryTime,
        updated_at: now,
        updated_by: session.user.email!,
      },
    },
  );

  await writeHistory(id, "gate_entry", session.user.email!, {
    ...existing,
    _id: id.toString(),
    gate_entry_time: entryTime,
  });
  revalidateTag("aviso-appointments", { expire: 0 });

  return { success: "recorded" };
}

export async function recordGateExit(id: string, time?: string) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasProcessAccess(session.user.roles)) return { error: "unauthorized" };

  const coll = await dbc("aviso_appointments");
  const existing = await coll.findOne({ _id: new ObjectId(id) });
  if (!existing) return { error: "not found" };

  if (!existing.gate_entry_time) {
    return { error: "entry required" };
  }

  const exitTime = time || formatTimeHm();
  const now = new Date();
  await coll.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        gate_exit_time: exitTime,
        updated_at: now,
        updated_by: session.user.email!,
      },
    },
  );

  await writeHistory(id, "gate_exit", session.user.email!, {
    ...existing,
    _id: id.toString(),
    gate_exit_time: exitTime,
  });
  revalidateTag("aviso-appointments", { expire: 0 });

  return { success: "recorded" };
}

export async function exportAppointments(params: {
  q?: string;
  from?: string;
  to?: string;
  format: "csv" | "xlsx";
}) {
  const session = await getSessionWithRoles();
  if (!session) return { error: "unauthorized" };
  if (!hasAdminAccess(session.user.roles)) return { error: "unauthorized" };

  const coll = await dbc("aviso_appointments");
  const filter: any = {};

  if (params.q) {
    const regex = { $regex: params.q, $options: "i" };
    filter.$or = [
      { plate: regex },
      { driver_name: regex },
      { company_name: regex },
      { carrier_name: regex },
      { driver_phone: regex },
      { company_phone: regex },
    ];
  }

  if (params.from || params.to) {
    filter.date = {};
    if (params.from) filter.date.$gte = params.from;
    if (params.to) filter.date.$lte = params.to;
  }

  const appointments = await coll
    .find(filter)
    .sort({ date: -1, window_start: 1 })
    .limit(10000)
    .toArray();

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (params.format === "csv") {
    const csv = generateCsvString(appointments);
    return {
      success: "Export ready",
      data: Buffer.from(`\uFEFF${csv}`).toString("base64"),
      filename: `awizacja-report-${dateStr}.csv`,
    };
  }

  const buffer = await generateExcelBuffer(appointments);
  return {
    success: "Export ready",
    data: buffer.toString("base64"),
    filename: `awizacja-report-${dateStr}.xlsx`,
  };
}
