'use client';

import { Button } from '@/components/ui/button';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { Dictionary } from '../lib/dict';
import SupervisorScheduleDayoffDialog from './supervisor-schedule-dayoff-dialog';

type ScheduleDayoffButtonProps = {
  submissionId: string;
  dict: Dictionary;
};

export default function ScheduleDayoffButton({
  submissionId,
  dict,
}: ScheduleDayoffButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button variant='outline' onClick={() => setIsDialogOpen(true)}>
        <CalendarCheck /> {dict.actions.scheduleDayOff}
      </Button>
      <SupervisorScheduleDayoffDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        submissionId={submissionId}
        dict={dict}
      />
    </>
  );
}
