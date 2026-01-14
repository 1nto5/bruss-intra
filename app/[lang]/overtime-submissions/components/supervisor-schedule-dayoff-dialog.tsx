'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { supervisorSetScheduledDayOff } from '../actions/approval';
import { Dictionary } from '../lib/dict';

type SupervisorScheduleDayoffDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  dict: Dictionary;
};

export default function SupervisorScheduleDayoffDialog({
  isOpen,
  onOpenChange,
  submissionId,
  dict,
}: SupervisorScheduleDayoffDialogProps) {
  const ScheduleDayoffSchema = z.object({
    scheduledDayOff: z.date({
      message: dict.validation.scheduledDayOffRequired,
    }),
    reason: z
      .string()
      .min(1, dict.errors.correctionReasonRequired)
      .max(500, dict.validation.rejectionReasonTooLong),
  });

  type ScheduleDayoffFormType = z.infer<typeof ScheduleDayoffSchema>;

  const form = useForm<ScheduleDayoffFormType>({
    resolver: zodResolver(ScheduleDayoffSchema),
    defaultValues: {
      scheduledDayOff: undefined,
      reason: '',
    },
  });

  const onSubmit = async (data: ScheduleDayoffFormType) => {
    toast.promise(
      supervisorSetScheduledDayOff(
        submissionId,
        data.scheduledDayOff,
        data.reason,
      ).then((res) => {
        if ('error' in res) {
          throw new Error(res.error);
        }
        return res;
      }),
      {
        loading: dict.toast.scheduling,
        success: dict.toast.scheduled,
        error: (error) => {
          const errorMsg = error.message;
          if (errorMsg === 'unauthorized') return dict.errors.unauthorized;
          if (errorMsg === 'not found') return dict.errors.notFound;
          if (errorMsg === 'invalid status') return dict.errors.invalidStatus;
          if (errorMsg === 'reason required')
            return dict.errors.correctionReasonRequired;
          if (errorMsg === 'invalid date')
            return dict.validation.scheduledDayOffRequired;
          console.error('onSubmit', errorMsg);
          return dict.errors.contactIT;
        },
      },
    );
    form.reset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{dict.dialogs.scheduleDayOff.title}</DialogTitle>
          <DialogDescription>
            {dict.dialogs.scheduleDayOff.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='scheduledDayOff'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {dict.dialogs.scheduleDayOff.dateLabel}
                  </FormLabel>
                  <FormControl>
                    <DateTimePicker
                      modal
                      hideTime
                      value={field.value}
                      onChange={field.onChange}
                      renderTrigger={({ open, value, setOpen }) => (
                        <DateTimeInput
                          value={field.value}
                          onChange={(x) => !open && field.onChange(x)}
                          format='dd/MM/yyyy'
                          disabled={open}
                          onCalendarClick={() => setOpen(!open)}
                        />
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {dict.dialogs.scheduleDayOff.reasonLabel}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.dialogs.scheduleDayOff.reasonPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleCancel}>
                {dict.actions.cancel}
              </Button>
              <Button type='submit'>
                {dict.dialogs.scheduleDayOff.buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
