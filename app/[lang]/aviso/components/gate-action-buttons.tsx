"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn, LogOut } from "lucide-react";
import { recordGateEntry, recordGateExit } from "../actions";
import type { AppointmentType } from "../lib/types";
import type { Dictionary } from "../lib/dict";

interface GateActionButtonsProps {
  appointment: AppointmentType;
  dict: Dictionary;
  onUpdate: () => void;
}

export default function GateActionButtons({
  appointment,
  dict,
  onUpdate,
}: GateActionButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  const handleEntry = async () => {
    if (!appointment._id) return;
    setEntryDialogOpen(false);
    setLoading(true);
    try {
      const result = await recordGateEntry(appointment._id);
      if ("success" in result) {
        toast.success(dict.gate.entryDone);
        onUpdate();
      } else if ("error" in result) {
        console.error("handleEntry", result.error);
        if (result.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch (error) {
      console.error("handleEntry", error);
      toast.error(dict.errors.contactIT);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    if (!appointment._id) return;
    setExitDialogOpen(false);
    setLoading(true);
    try {
      const result = await recordGateExit(appointment._id);
      if ("success" in result) {
        toast.success(dict.gate.exitDone);
        onUpdate();
      } else if ("error" in result) {
        console.error("handleExit", result.error);
        if (result.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch (error) {
      console.error("handleExit", error);
      toast.error(dict.errors.contactIT);
    } finally {
      setLoading(false);
    }
  };

  const hasEntry = Boolean(appointment.gate_entry_time);
  const hasExit = Boolean(appointment.gate_exit_time);

  if (hasEntry && hasExit) return null;

  return (
    <>
      {!hasEntry && (
        <>
          <Button onClick={() => setEntryDialogOpen(true)} disabled={loading}>
            <LogIn />
            {dict.gate.entry}
          </Button>
          <AlertDialog
            open={entryDialogOpen}
            onOpenChange={setEntryDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {dict.gate.entryConfirmTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {dict.gate.entryConfirm}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{dict.form.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleEntry}>
                  {dict.gate.entry}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {hasEntry && !hasExit && (
        <>
          <Button
            variant="destructive"
            onClick={() => setExitDialogOpen(true)}
            disabled={loading}
          >
            <LogOut />
            {dict.gate.exit}
          </Button>
          <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {dict.gate.exitConfirmTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {dict.gate.exitConfirm}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{dict.form.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleExit}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {dict.gate.exit}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
