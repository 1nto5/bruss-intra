"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LocalizedLink from "@/components/localized-link";
import { History, Plus, Tv } from "lucide-react";
import TimelineBoard from "./timeline-board";
import AvisoFilters from "./aviso-filters";
import CreateAppointmentDialog from "./create-appointment-dialog";
import type { AppointmentType, BoardScope, BoardOperation } from "../lib/types";
import { filterAppointments } from "../lib/status";
import type { Dictionary } from "../lib/dict";

interface AvisoPageClientProps {
  initialAppointments: AppointmentType[];
  date: string;
  scope: BoardScope;
  op: BoardOperation;
  dict: Dictionary;
  canEdit: boolean;
  canGateOp: boolean;
  userEmail: string | null;
}

export default function AvisoPageClient({
  initialAppointments,
  date: initialDate,
  scope: initialScope,
  op: initialOp,
  dict,
  canEdit,
  canGateOp,
  userEmail,
}: AvisoPageClientProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [date, setDate] = useState(initialDate);
  const [scope, setScope] = useState<BoardScope>(initialScope);
  const [op, setOp] = useState<BoardOperation>(initialOp);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Sync server-revalidated data into client state
  useEffect(() => {
    setAppointments(initialAppointments);
  }, [initialAppointments]);

  const fetchAppointments = useCallback(async (fetchDate: string) => {
    try {
      const res = await fetch(`/api/aviso?date=${fetchDate}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data);
    } catch {
      // keep current data on error
    }
  }, []);

  // Update URL params without navigation
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (scope !== "all") params.set("scope", scope);
    if (op !== "all") params.set("op", op);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [date, scope, op]);

  // Fetch when date changes
  useEffect(() => {
    fetchAppointments(date);
  }, [date, fetchAppointments]);

  // Auto-refresh every 3s
  useEffect(() => {
    const interval = setInterval(() => fetchAppointments(date), 3000);
    return () => clearInterval(interval);
  }, [date, fetchAppointments]);

  const filtered = filterAppointments(appointments, scope, op);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{dict.page.title}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canEdit && (
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus />
                  {dict.form.create}
                </Button>
              )}
              <LocalizedLink href="/aviso/tv">
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                >
                  <Tv />
                  {dict.board.tvMode}
                </Button>
              </LocalizedLink>
              {canEdit && (
                <LocalizedLink href="/aviso/history">
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    size="sm"
                  >
                    <History />
                    {dict.history.title}
                  </Button>
                </LocalizedLink>
              )}
            </div>
          </div>
          <AvisoFilters
            date={date}
            op={op}
            onDateChange={setDate}
            onOpChange={setOp}
            appointments={appointments}
            scope={scope}
            onScopeChange={setScope}
            dict={dict}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <TimelineBoard
            appointments={filtered}
            date={date}
            dict={dict}
            canEdit={canEdit}
            canGateOp={canGateOp}
            onUpdate={() => fetchAppointments(date)}
          />
        </CardContent>
      </Card>

      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        dict={dict}
        defaultDate={date}
        onCreated={() => fetchAppointments(date)}
      />
    </>
  );
}
