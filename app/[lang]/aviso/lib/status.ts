import { type AppointmentType, type AppointmentStatus } from "./types";
import { isValidTime, toMinutes, parseDateTimeLocal } from "./time-utils";

export function getAppointmentStatus(
  appointment: AppointmentType,
  now: Date = new Date(),
): AppointmentStatus {
  if (appointment.gate_exit_time) return "departed";
  if (appointment.gate_entry_time) return "arrived";
  if (isDelayed(appointment, now)) return "delayed";
  return "waiting";
}

export function isDelayed(
  appointment: AppointmentType,
  now: Date = new Date(),
): boolean {
  if (appointment.gate_entry_time) return false;
  const windowStart = parseDateTimeLocal(
    appointment.date,
    appointment.window_start,
  );
  if (!windowStart) return false;
  return now.getTime() > windowStart.getTime();
}

export function computeDelayMinutes(
  record: AppointmentType,
  now: Date = new Date(),
): number | null {
  const scheduled = parseDateTimeLocal(record.date, record.window_start);
  if (!scheduled) return null;

  if (isValidTime(record.gate_entry_time || "")) {
    const entry = parseDateTimeLocal(record.date, record.gate_entry_time);
    if (!entry) return null;
    return Math.max(
      0,
      Math.round((entry.getTime() - scheduled.getTime()) / 60000),
    );
  }

  const liveDelay = Math.round((now.getTime() - scheduled.getTime()) / 60000);
  return liveDelay > 0 ? liveDelay : 0;
}

export function computeYardMinutes(
  record: AppointmentType,
  now: Date = new Date(),
): number | null {
  if (!isValidTime(record.gate_entry_time || "")) return null;

  const entry = parseDateTimeLocal(record.date, record.gate_entry_time);
  if (!entry) return null;

  if (isValidTime(record.gate_exit_time || "")) {
    return toMinutes(record.gate_exit_time) - toMinutes(record.gate_entry_time);
  }

  const live = Math.round((now.getTime() - entry.getTime()) / 60000);
  return live > 0 ? live : 0;
}

export function getOperationLabel(appointment: AppointmentType): string {
  if (appointment.op_loading && appointment.op_unloading)
    return "loading+unloading";
  if (appointment.op_loading) return "loading";
  if (appointment.op_unloading) return "unloading";
  return "unknown";
}

export function getOperationTag(appointment: AppointmentType): string {
  if (appointment.op_loading && appointment.op_unloading) return "ZA+ROZ";
  if (appointment.op_loading) return "ZA";
  if (appointment.op_unloading) return "ROZ";
  return "N/A";
}

export function filterAppointments(
  appointments: AppointmentType[],
  scope: "all" | "waiting" | "yard" | "delayed" | "departed",
  op: "all" | "loading" | "unloading",
  now: Date = new Date(),
): AppointmentType[] {
  return appointments.filter((a) => {
    if (op === "loading" && !a.op_loading) return false;
    if (op === "unloading" && !a.op_unloading) return false;
    if (scope === "yard")
      return Boolean(a.gate_entry_time) && !a.gate_exit_time;
    if (scope === "delayed") return isDelayed(a, now);
    if (scope === "waiting") return !a.gate_entry_time && !isDelayed(a, now);
    if (scope === "departed") return Boolean(a.gate_exit_time);
    return true;
  });
}
