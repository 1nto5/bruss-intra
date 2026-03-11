"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LedIndicator } from "@/components/ui/led-indicator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DialogFormActions } from "@/components/ui/dialog-form";
import DialogScrollArea from "@/components/dialog-scroll-area";
import DialogFormWithScroll from "@/components/dialog-form-with-scroll";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import GateActionButtons from "./gate-action-buttons";
import AppointmentFormFields from "./appointment-form-fields";
import DeleteAppointmentDialog from "./delete-appointment-dialog";
import { updateAppointment } from "../actions";
import { appointmentSchema, type AppointmentFormData } from "../lib/zod";
import {
  getAppointmentStatus,
  computeDelayMinutes,
  computeYardMinutes,
  getOperationLabel,
} from "../lib/status";
import { formatDate } from "@/lib/utils/date-format";
import type { AppointmentType, AppointmentStatus } from "../lib/types";
import type { Dictionary } from "../lib/dict";

interface AppointmentDialogProps {
  appointment: AppointmentType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canGateOp: boolean;
  dict: Dictionary;
  onUpdate: () => void;
}

const STATUS_BANNER: Record<
  AppointmentStatus,
  {
    bg: string;
    led: "amber" | "green" | "red" | "off";
    animation: "blink" | "none" | "blink-fast";
  }
> = {
  waiting: {
    bg: "bg-amber-50 dark:bg-amber-950/60",
    led: "amber",
    animation: "blink",
  },
  delayed: {
    bg: "bg-red-50 dark:bg-red-950/60",
    led: "red",
    animation: "blink-fast",
  },
  arrived: {
    bg: "bg-[oklch(0.97_0.03_145)] dark:bg-[oklch(0.22_0.04_145)]",
    led: "green",
    animation: "none",
  },
  departed: { bg: "bg-[var(--panel-inset)]", led: "off", animation: "none" },
};

function OperationIcon({ appointment }: { appointment: AppointmentType }) {
  const label = getOperationLabel(appointment);
  const cls = "h-4 w-4 shrink-0 text-muted-foreground";
  if (label === "loading+unloading") return <ArrowUpDown className={cls} />;
  if (label === "loading") return <ArrowUp className={cls} />;
  if (label === "unloading") return <ArrowDown className={cls} />;
  return null;
}

function getOperationText(
  appointment: AppointmentType,
  dict: Dictionary,
): string {
  const label = getOperationLabel(appointment);
  if (label === "loading+unloading") return dict.loadingUnloading;
  if (label === "loading") return dict.loading;
  if (label === "unloading") return dict.unloading;
  return dict.unknown;
}

export default function AppointmentDialog({
  appointment,
  open,
  onOpenChange,
  canEdit,
  canGateOp,
  dict,
  onUpdate,
}: AppointmentDialogProps) {
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      plate: "",
      date: new Date().toISOString().slice(0, 10),
      window_start: "06:00",
      window_end: "07:00",
      op_loading: false,
      op_unloading: false,
      driver_name: "",
      company_name: "",
      carrier_name: "",
      driver_phone: "",
      company_phone: "",
      comment: "",
    },
  });

  useEffect(() => {
    if (open && appointment) {
      form.reset({
        plate: appointment.plate ?? "",
        date:
          appointment.date ?? new Date().toISOString().slice(0, 10),
        window_start: appointment.window_start ?? "06:00",
        window_end: appointment.window_end ?? "07:00",
        op_loading: appointment.op_loading ?? false,
        op_unloading: appointment.op_unloading ?? false,
        driver_name: appointment.driver_name ?? "",
        company_name: appointment.company_name ?? "",
        carrier_name: appointment.carrier_name ?? "",
        driver_phone: appointment.driver_phone ?? "",
        company_phone: appointment.company_phone ?? "",
        comment: appointment.comment ?? "",
      });
      setEditing(false);
    }
  }, [open, appointment]);

  const handleClose = (value: boolean) => {
    if (!value) {
      setEditing(false);
    }
    onOpenChange(value);
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!appointment?._id) return;
    setIsPending(true);
    try {
      const result = await updateAppointment(appointment._id, data);
      if ("success" in result) {
        toast.success(dict.toast.updated);
        setEditing(false);
        onUpdate();
      } else if ("error" in result) {
        console.error("onSubmit", result.error);
        if (result.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else if (result.error === "not found") {
          toast.error(dict.errors.notFound);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch (error) {
      console.error("onSubmit", error);
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleted = () => {
    onOpenChange(false);
    onUpdate();
  };

  if (!appointment) return null;

  const status = getAppointmentStatus(appointment);
  const banner = STATUS_BANNER[status];
  const delay = computeDelayMinutes(appointment);
  const yardTime = computeYardMinutes(appointment);

  if (editing) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{dict.form.edit}</DialogTitle>
            <DialogDescription>
              {appointment.plate} - {formatDate(appointment.date)}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogScrollArea>
                <DialogFormWithScroll>
                  <AppointmentFormFields dict={dict} modal />
                  {form.formState.errors.root && (
                    <p className="text-destructive text-sm font-medium">
                      {form.formState.errors.root.message}
                    </p>
                  )}
                </DialogFormWithScroll>
              </DialogScrollArea>
              <DialogFormActions
                onCancel={() => setEditing(false)}
                isPending={isPending}
                cancelLabel={dict.form.cancel}
                submitLabel={dict.form.save}
                submitIcon={<Save />}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dict.details.title}</DialogTitle>
          <DialogDescription>
            {appointment.plate} - {formatDate(appointment.date)}
          </DialogDescription>
        </DialogHeader>
        <DialogScrollArea>
          <DialogFormWithScroll>
            {/* Status banner */}
            <div
              className={`flex items-center gap-2 rounded-sm border border-[var(--panel-border)] px-3 py-2 ${banner.bg}`}
            >
              <LedIndicator
                color={banner.led}
                size="default"
                animation={banner.animation}
              />
              <span className="text-sm font-semibold">
                {dict.status[status]}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {appointment.window_start} - {appointment.window_end}
              </span>
            </div>

            {/* Metric cards */}
            {((delay !== null && delay > 0) || yardTime !== null) && (
              <div className="grid grid-cols-2 gap-3">
                {delay !== null && delay > 0 && (
                  <Card variant="inset" className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {dict.details.delay}
                    </span>
                    <span className="block font-mono text-lg font-bold tabular-nums text-[var(--led-red)]">
                      {delay} {dict.details.minutes}
                    </span>
                  </Card>
                )}
                {yardTime !== null && (
                  <Card variant="inset" className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {dict.details.yardTime}
                    </span>
                    <span className="block font-mono text-lg font-bold tabular-nums text-[var(--led-blue)]">
                      {yardTime} {dict.details.minutes}
                    </span>
                  </Card>
                )}
              </div>
            )}

            {/* Operation */}
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground font-medium">
                    {dict.details.operation}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <OperationIcon appointment={appointment} />
                      {getOperationText(appointment, dict)}
                    </span>
                  </TableCell>
                </TableRow>
                {appointment.comment && (
                  <TableRow>
                    <TableCell className="text-muted-foreground font-medium">
                      {dict.details.comment}
                    </TableCell>
                    <TableCell>{appointment.comment}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Contact */}
            {(appointment.driver_name ||
              appointment.company_name ||
              appointment.carrier_name ||
              appointment.driver_phone ||
              appointment.company_phone) && (
              <Table>
                <TableBody>
                  {appointment.driver_name && (
                    <TableRow>
                      <TableCell className="text-muted-foreground font-medium">
                        {dict.details.driverName}
                      </TableCell>
                      <TableCell>{appointment.driver_name}</TableCell>
                    </TableRow>
                  )}
                  {appointment.company_name && (
                    <TableRow>
                      <TableCell className="text-muted-foreground font-medium">
                        {dict.details.companyName}
                      </TableCell>
                      <TableCell>{appointment.company_name}</TableCell>
                    </TableRow>
                  )}
                  {appointment.carrier_name && (
                    <TableRow>
                      <TableCell className="text-muted-foreground font-medium">
                        {dict.details.carrierName}
                      </TableCell>
                      <TableCell>{appointment.carrier_name}</TableCell>
                    </TableRow>
                  )}
                  {appointment.driver_phone && (
                    <TableRow>
                      <TableCell className="text-muted-foreground font-medium">
                        {dict.details.driverPhone}
                      </TableCell>
                      <TableCell>{appointment.driver_phone}</TableCell>
                    </TableRow>
                  )}
                  {appointment.company_phone && (
                    <TableRow>
                      <TableCell className="text-muted-foreground font-medium">
                        {dict.details.companyPhone}
                      </TableCell>
                      <TableCell>{appointment.company_phone}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {/* Gate */}
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground font-medium">
                    <span className="flex items-center gap-2">
                      <LedIndicator
                        color={appointment.gate_entry_time ? "green" : "off"}
                        size="sm"
                      />
                      {dict.details.gateEntry}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {appointment.gate_entry_time || "-"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground font-medium">
                    <span className="flex items-center gap-2">
                      <LedIndicator
                        color={appointment.gate_exit_time ? "blue" : "off"}
                        size="sm"
                      />
                      {dict.details.gateExit}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {appointment.gate_exit_time || "-"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogFormWithScroll>
        </DialogScrollArea>

        {(canEdit || canGateOp) && (
          <DialogFooter className="sm:justify-between">
            {canEdit ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 />
                  {dict.form.delete}
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  {dict.form.edit}
                </Button>
              </div>
            ) : (
              <div />
            )}
            {canGateOp && (
              <div className="flex gap-2">
                <GateActionButtons
                  appointment={appointment}
                  dict={dict}
                  onUpdate={onUpdate}
                />
              </div>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      <DeleteAppointmentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        appointmentId={appointment._id!}
        dict={dict}
        onDeleted={handleDeleted}
      />
    </Dialog>
  );
}

