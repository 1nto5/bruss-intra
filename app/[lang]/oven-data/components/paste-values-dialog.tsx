'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DialogFormContent } from '@/components/ui/dialog-form';
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
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import type { Dictionary } from '../lib/dict';

const PasteValuesSchema = z.object({
  values: z.string(),
});

type PasteValuesFormData = z.infer<typeof PasteValuesSchema>;

interface PasteValuesDialogProps {
  fieldType: 'hydra_batch' | 'article';
  fieldLabel: string;
  currentValue: string;
  currentCount: number;
  onApplyValues: (values: string) => void;
  children: React.ReactNode;
  dict: Dictionary;
}

export default function PasteValuesDialog({
  fieldType,
  fieldLabel,
  currentValue,
  currentCount,
  onApplyValues,
  children,
  dict,
}: PasteValuesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPendingApply, setIsPendingApply] = useState(false);

  // Helper function to convert comma-separated values to newline-separated
  const formatCurrentValues = (value: string) => {
    if (!value) return '';
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .join('\n');
  };

  const form = useForm<PasteValuesFormData>({
    resolver: zodResolver(PasteValuesSchema),
    defaultValues: {
      values: '',
    },
  });

  // Update form when dialog opens with current values formatted
  useEffect(() => {
    if (open) {
      form.reset({
        values: formatCurrentValues(currentValue),
      });
    }
  }, [open, currentValue, form]);

  const onSubmit = async (data: PasteValuesFormData) => {
    setIsPendingApply(true);
    try {
      // Parse the pasted values - split by newlines and filter out empty lines
      const valuesList = data.values
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Validate values based on field type
      if (valuesList.length > 0) {
        const invalidValues: string[] = [];

        valuesList.forEach((value) => {
          if (fieldType === 'article') {
            // Article should be 5 digits
            if (!/^\d{5}$/.test(value)) {
              invalidValues.push(value);
            }
          } else if (fieldType === 'hydra_batch') {
            // HYDRA Batch should be 10 characters
            if (value.length !== 10) {
              invalidValues.push(value);
            }
          }
        });

        if (invalidValues.length > 0) {
          const errorMessage =
            fieldType === 'article'
              ? `${dict.pasteDialog.invalidArticle}: ${invalidValues.slice(0, 3).join(', ')}${invalidValues.length > 3 ? '...' : ''}`
              : `${dict.pasteDialog.invalidHydraBatch}: ${invalidValues.slice(0, 3).join(', ')}${invalidValues.length > 3 ? '...' : ''}`;

          toast.error(errorMessage);
          return;
        }
      }

      // Convert to comma-separated format or empty string if no values
      const commaSeparatedValues =
        valuesList.length > 0 ? valuesList.join(', ') : '';

      // Apply the values using the callback
      onApplyValues(commaSeparatedValues);

      const message =
        valuesList.length > 0
          ? `${dict.pasteDialog.appliedValues} ${fieldLabel}: ${valuesList.length}`
          : `${dict.pasteDialog.clearedFilter} ${fieldLabel}`;

      toast.success(message);
      setOpen(false);
      form.reset({ values: '' });
    } catch (error) {
      console.error('Error applying pasted values:', error);
      toast.error(dict.pasteDialog.errorApplying);
    } finally {
      setIsPendingApply(false);
    }
  };

  const handleClearAll = () => {
    onApplyValues('');
    toast.success(`${dict.pasteDialog.clearedFilter} ${fieldLabel}`);
    setOpen(false);
    form.reset({ values: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{dict.pasteDialog.manageTitle} {fieldLabel}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogFormContent>
              <FormField
              control={form.control}
              name='values'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.pasteDialog.valuesLabel}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        currentCount > 0
                          ? fieldType === 'article'
                            ? dict.pasteDialog.placeholderArticleCurrent
                            : dict.pasteDialog.placeholderHydraBatchCurrent
                          : fieldType === 'article'
                            ? dict.pasteDialog.placeholderArticle
                            : dict.pasteDialog.placeholderHydraBatch
                      }
                      className='min-h-[150px]'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </DialogFormContent>
            <DialogFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
              <div className='flex flex-col gap-2 sm:flex-row sm:gap-2'>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={handleClearAll}
                  disabled={isPendingApply}
                  className='w-full sm:w-auto'
                >
                  <Trash2 />
                  {dict.pasteDialog.clearAll}
                </Button>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setOpen(false);
                  }}
                  className='w-full sm:w-auto'
                >
                  <X />
                  {dict.pasteDialog.cancel}
                </Button>
              </div>
              <Button type='submit' disabled={isPendingApply} className='w-full sm:w-auto'>
                {isPendingApply ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <Check />
                )}
                {dict.pasteDialog.confirm}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
