'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cancelDeviation } from '../actions';
import { Dictionary } from '../lib/dict';
import * as z from 'zod';

interface CancelDeviationDialogProps {
  deviationId: string;
  dict: Dictionary;
}

const cancelFormSchema = z.object({
  reason: z.string().optional(),
});

export default function CancelDeviationDialog({
  deviationId,
  dict,
}: CancelDeviationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof cancelFormSchema>>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof cancelFormSchema>) => {
    if (!deviationId) {
      toast.error(dict.dialogs.cancelDeviation.errors.deviationIdError);
      return;
    }

    setIsSubmitting(true);
    setOpen(false);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const result = await cancelDeviation(
            deviationId,
            data.reason || undefined,
          );

          if (result.success) {
            form.reset();
            resolve();
          } else if (result.error === 'cannot cancel') {
            reject(new Error(dict.dialogs.cancelDeviation.errors.cannotCancel));
          } else if (result.error === 'not authorized') {
            reject(new Error(dict.dialogs.cancelDeviation.errors.notAuthorized));
          } else {
            reject(new Error(dict.dialogs.cancelDeviation.errors.contactIT));
          }
        } catch (error) {
          console.error('Cancel deviation error:', error);
          reject(new Error(dict.dialogs.cancelDeviation.errors.contactIT));
        } finally {
          setIsSubmitting(false);
        }
      }),
      {
        loading: dict.dialogs.cancelDeviation.toasts.loading,
        success: dict.dialogs.cancelDeviation.toasts.success,
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='destructive'>
          <Ban className='mr-2 h-4 w-4' />
          {dict.dialogs.cancelDeviation.triggerButton}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{dict.dialogs.cancelDeviation.title}</DialogTitle>
          <DialogDescription>
            {dict.dialogs.cancelDeviation.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='reason'>
                    {dict.dialogs.cancelDeviation.reasonLabel}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      id='reason'
                      placeholder={dict.dialogs.cancelDeviation.reasonPlaceholder}
                      className='h-24'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='mt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                {dict.dialogs.cancelDeviation.cancelButton}
              </Button>
              <Button type='submit' variant='destructive' disabled={isSubmitting}>
                <Ban className='mr-2 h-4 w-4' />
                {dict.dialogs.cancelDeviation.confirmButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
