"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LedIndicator } from "@/components/ui/led-indicator";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  History,
  LayoutList,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import LocalizedLink from "@/components/localized-link";
import {
  getAppointmentStatus,
  computeDelayMinutes,
  computeYardMinutes,
  getOperationLabel,
} from "../lib/status";
import { formatDate, formatDateTime } from "@/lib/utils/date-format";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import type {
  AppointmentType,
  AppointmentStatus,
  HistoryEntry,
} from "../lib/types";
import type { Dictionary } from "../lib/dict";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    variant:
      | "statusPending"
      | "statusApproved"
      | "statusRejected"
      | "statusClosed";
  }
> = {
  waiting: { variant: "statusPending" },
  delayed: { variant: "statusRejected" },
  arrived: { variant: "statusApproved" },
  departed: { variant: "statusClosed" },
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

interface AppointmentDetailProps {
  appointment: AppointmentType;
  history: HistoryEntry[];
  dict: Dictionary;
}

export default function AppointmentDetail({
  appointment,
  history,
  dict,
}: AppointmentDetailProps) {
  const searchParams = useSearchParams();
  const backHref = `/aviso/history${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const status = getAppointmentStatus(appointment);
  const delay = computeDelayMinutes(appointment);
  const yardTime = computeYardMinutes(appointment);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="mb-2 sm:mb-0">
            <Badge
              variant={STATUS_CONFIG[status].variant}
              size="lg"
              className="text-lg"
            >
              {dict.status[status]}
            </Badge>
          </CardTitle>
          <LocalizedLink href={backHref}>
            <Button variant="outline">
              <ArrowLeft /> {dict.details.backToHistory}
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent>
        <div className="flex-col space-y-4">
          <div className="space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4">
            {/* Left column - Details */}
            <Card className="lg:w-5/12">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LayoutList className="mr-2 h-5 w-5" /> {dict.details.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.plate}:
                      </TableCell>
                      <TableCell>{appointment.plate}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.date}:
                      </TableCell>
                      <TableCell>{formatDate(appointment.date)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.window}:
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {appointment.window_start} - {appointment.window_end}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.operation}:
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
                        <TableCell className="font-medium">
                          {dict.details.comment}:
                        </TableCell>
                        <TableCell>{appointment.comment}</TableCell>
                      </TableRow>
                    )}
                    {appointment.driver_name && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.driverName}:
                        </TableCell>
                        <TableCell>{appointment.driver_name}</TableCell>
                      </TableRow>
                    )}
                    {appointment.company_name && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.companyName}:
                        </TableCell>
                        <TableCell>{appointment.company_name}</TableCell>
                      </TableRow>
                    )}
                    {appointment.carrier_name && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.carrierName}:
                        </TableCell>
                        <TableCell>{appointment.carrier_name}</TableCell>
                      </TableRow>
                    )}
                    {appointment.driver_phone && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.driverPhone}:
                        </TableCell>
                        <TableCell>{appointment.driver_phone}</TableCell>
                      </TableRow>
                    )}
                    {appointment.company_phone && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.companyPhone}:
                        </TableCell>
                        <TableCell>{appointment.company_phone}</TableCell>
                      </TableRow>
                    )}
                    {appointment.items && appointment.items.length > 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="p-0 pt-2"
                        >
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>
                                  {dict.details.articleNumber}
                                </TableHead>
                                <TableHead>
                                  {dict.details.quantity}
                                </TableHead>
                                <TableHead>
                                  {dict.details.transferOrder}
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {appointment.items.map((item, i) => (
                                <TableRow key={i}>
                                  <TableCell>
                                    {item.article_number}
                                  </TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>
                                    {item.transfer_order}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.gateEntry}:
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <LedIndicator
                            color={
                              appointment.gate_entry_time ? "green" : "off"
                            }
                            size="sm"
                          />
                          <span className="font-mono text-xs">
                            {appointment.gate_entry_time || "-"}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.details.gateExit}:
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <LedIndicator
                            color={appointment.gate_exit_time ? "blue" : "off"}
                            size="sm"
                          />
                          <span className="font-mono text-xs">
                            {appointment.gate_exit_time || "-"}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                    {delay !== null && delay > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.delay}:
                        </TableCell>
                        <TableCell className="font-mono font-bold tabular-nums text-[var(--led-red)]">
                          {delay} {dict.details.minutes}
                        </TableCell>
                      </TableRow>
                    )}
                    {yardTime !== null && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.yardTime}:
                        </TableCell>
                        <TableCell className="font-mono font-bold tabular-nums text-[var(--led-blue)]">
                          {yardTime} {dict.details.minutes}
                        </TableCell>
                      </TableRow>
                    )}
                    {appointment.created_by && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.createdBy}:
                        </TableCell>
                        <TableCell>
                          {extractNameFromEmail(appointment.created_by)}
                        </TableCell>
                      </TableRow>
                    )}
                    {appointment.updated_by && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.details.updatedBy}:
                        </TableCell>
                        <TableCell>
                          {extractNameFromEmail(appointment.updated_by)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right column - Change log */}
            <div className="flex-col space-y-4 lg:w-7/12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-5 w-5" />{" "}
                    {dict.history.changeLog}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.history.changedAt}</TableHead>
                        <TableHead>{dict.history.changedBy}</TableHead>
                        <TableHead>{dict.history.actionHeader}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length > 0 ? (
                        history.map((entry) => (
                          <TableRow key={entry._id}>
                            <TableCell>
                              {formatDateTime(
                                entry.changed_at as unknown as string,
                              )}
                            </TableCell>
                            <TableCell>
                              {extractNameFromEmail(entry.changed_by)}
                            </TableCell>
                            <TableCell>
                              {dict.history.action[
                                entry.action as keyof typeof dict.history.action
                              ] || entry.action}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-muted-foreground text-center"
                          >
                            {dict.history.noResults}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
