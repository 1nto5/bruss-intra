export interface AppointmentItem {
  article_number: string;
  quantity: string;
  transfer_order: string;
}

export interface AppointmentType {
  _id?: string;
  plate: string;
  date: string;
  window_start: string;
  window_end: string;
  op_loading: boolean;
  op_unloading: boolean;
  driver_name: string;
  company_name: string;
  carrier_name: string;
  driver_phone: string;
  company_phone: string;
  comment: string;
  items?: AppointmentItem[];
  gate_entry_time: string;
  gate_exit_time: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

export interface HistoryEntry {
  _id?: string;
  appointment_id: string;
  action: "create" | "update" | "delete" | "gate_entry" | "gate_exit";
  changed_at: Date;
  changed_by: string;
  snapshot: Partial<AppointmentType>;
}

export type AppointmentStatus = "departed" | "arrived" | "delayed" | "waiting";
export type BoardScope = "all" | "waiting" | "yard" | "delayed" | "departed";
export type BoardOperation = "all" | "loading" | "unloading";
