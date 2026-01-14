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
import { sendEmployeeOvertimeReminder } from '../actions/reminder';
import { Dictionary } from '../lib/dict';

type RemindEmployeeDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeEmail: string;
  employeeName: string;
  totalHours: number;
  dict: Dictionary;
};

export default function RemindEmployeeDialog({
  isOpen,
  onOpenChange,
  employeeEmail,
  employeeName,
  totalHours,
  dict,
}: RemindEmployeeDialogProps) {
  const [customNote, setCustomNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const result = await sendEmployeeOvertimeReminder(
        employeeEmail,
        totalHours,
        customNote || undefined,
      );

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(
          dict.toast?.reminderSent || 'Reminder sent successfully!',
        );
        setCustomNote('');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error(dict.errors?.contactIT || 'Contact IT!');
    } finally {
      setIsLoading(false);
    }
  };

  const description = (dict.dialogs?.remindEmployee?.description || '')
    .replace('{name}', employeeName)
    .replace('{hours}', totalHours.toString());

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.dialogs?.remindEmployee?.title || 'Send reminder to employee'}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='note'>
              {dict.dialogs?.remindEmployee?.noteLabel || 'Custom note (optional)'}
            </Label>
            <Textarea
              id='note'
              placeholder={
                dict.dialogs?.remindEmployee?.notePlaceholder ||
                'Add instructions or a personal message...'
              }
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
              : dict.dialogs?.remindEmployee?.buttonText || 'Send reminder'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
