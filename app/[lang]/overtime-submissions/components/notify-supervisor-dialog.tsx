'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { sendSupervisorNotification } from '../actions/reminder';
import { Dictionary } from '../lib/dict';

type NotifySupervisorDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  supervisorEmail: string;
  supervisorName: string;
  employeeEmail: string;
  employeeUserId: string;
  employeeName: string;
  totalHours: number;
  dict: Dictionary;
};

export default function NotifySupervisorDialog({
  isOpen,
  onOpenChange,
  supervisorEmail,
  supervisorName,
  employeeEmail,
  employeeUserId,
  employeeName,
  totalHours,
  dict,
}: NotifySupervisorDialogProps) {
  const [customNote, setCustomNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const result = await sendSupervisorNotification(
        supervisorEmail,
        employeeEmail,
        employeeUserId,
        totalHours,
        customNote || undefined,
      );

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(
          dict.toast?.notificationSent || 'Notification sent successfully!',
        );
        setCustomNote('');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error(dict.errors?.contactIT || 'Contact IT!');
    } finally {
      setIsLoading(false);
    }
  };

  const description = (dict.dialogs?.notifySupervisor?.description || '')
    .replace('{supervisorName}', supervisorName)
    .replace('{employeeName}', employeeName)
    .replace('{hours}', totalHours.toString());

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.dialogs?.notifySupervisor?.title || 'Notify supervisor'}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='note'>
              {dict.dialogs?.notifySupervisor?.noteLabel ||
                'Custom note (optional)'}
            </Label>
            <Textarea
              id='note'
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {dict.actions?.cancel || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={isLoading}>
            {isLoading
              ? '...'
              : dict.dialogs?.notifySupervisor?.buttonText ||
                'Send notification'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
