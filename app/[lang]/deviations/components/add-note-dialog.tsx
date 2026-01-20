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
import { StickyNote } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { addNote } from '../actions';
import { Dictionary } from '../lib/dict';
import { createNoteFormSchema } from '../lib/zod';
import * as z from 'zod';

interface AddNoteDialogProps {
  deviationId: string;
  dict: Dictionary;
}

export default function AddNoteDialog({ deviationId, dict }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noteFormSchema = createNoteFormSchema(dict.form.validation);

  const form = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof noteFormSchema>) => {
    if (!deviationId) {
      toast.error(dict.dialogs.addNote.errors.deviationIdError);
      return;
    }

    setIsSubmitting(true);

    // Close dialog immediately for better UX
    setOpen(false);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          const result = await addNote(deviationId, data.content);

          if (result.success) {
            form.reset();
            resolve();
          } else {
            if (result.error) {
              console.error('Note submission error:', result.error);
            }
            reject(new Error(dict.dialogs.addNote.errors.contactIT));
          }
        } catch (error) {
          console.error('Note submission error:', error);
          reject(new Error(dict.dialogs.addNote.errors.contactIT));
        } finally {
          setIsSubmitting(false);
        }
      }),
      {
        loading: dict.dialogs.addNote.toasts.loading,
        success: dict.dialogs.addNote.toasts.success,
        error: (err) => err.message,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>
          <StickyNote className='' />
          {dict.dialogs.addNote.triggerButton}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{dict.dialogs.addNote.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor='content'>{dict.dialogs.addNote.contentLabel}</FormLabel>
                  <FormControl>
                    <Textarea
                      id='content'
                      placeholder={dict.dialogs.addNote.contentPlaceholder}
                      className='h-32'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='mt-4'>
              <Button type='submit' disabled={isSubmitting}>
                <StickyNote />
                {dict.dialogs.addNote.submitButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
