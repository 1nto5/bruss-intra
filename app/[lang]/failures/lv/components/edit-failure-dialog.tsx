'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DialogFormActions } from '@/components/ui/dialog-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Save } from 'lucide-react';
import { FailureType } from '../lib/failures-types';

// import { Separator } from '@/components/ui/separator';
import { createUpdateFailureSchema } from '@/app/[lang]/failures/lv/lib/failures-zod';
import { Dictionary } from '../../lib/dict';
import DialogFormWithScroll from '@/components/dialog-form-with-scroll';
import DialogScrollArea from '@/components/dialog-scroll-area';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { updateFailure } from '../actions';

export default function EditFailureDialog({
  failure,
  dict,
}: {
  failure: FailureType;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);

  const updateFailureSchema = createUpdateFailureSchema(dict.validation);

  const form = useForm<z.infer<typeof updateFailureSchema>>({
    resolver: zodResolver(updateFailureSchema),
    defaultValues: {
      from: new Date(failure.from),
      to: new Date(failure.to),
      supervisor: failure.supervisor,
      responsible: failure.responsible,
      solution: failure.solution,
      comment: failure.comment,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        from: new Date(failure.from),
        to: new Date(failure.to),
        supervisor: failure.supervisor,
        responsible: failure.responsible,
        solution: failure.solution,
        comment: failure.comment,
      });
    }
  }, [open, failure]);

  const onSubmit = async (data: z.infer<typeof updateFailureSchema>) => {
    // setIsDraft(false);
    setIsPendingUpdate(true);
    try {
      const res = await updateFailure({
        _id: failure._id,
        from: data.from,
        to: data.to,
        supervisor: data.supervisor,
        responsible: data.responsible,
        solution: data.solution,
        comment: data.comment,
      });
      if (res.success) {
        toast.success('Awaria zapisana!');
      } else if (res.error) {
        console.error(res.error);
        toast.error('Skontaktuj się z IT!');
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error('Skontaktuj się z IT!');
    } finally {
      setIsPendingUpdate(false);
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <Button size={'sm'} variant={'outline'}>
            <Pencil />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Edycja awarii</DialogTitle>
          <DialogDescription>
            Linia: {failure.line.toUpperCase()}, stacja: {failure.station},
            awaria: {failure.failure}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogScrollArea>
              <DialogFormWithScroll>
                {/* Data rozpoczęcia */}
                <FormField
                  control={form.control}
                  name='from'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Rozpoczęcie</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          min={new Date(Date.now() - 8 * 3600 * 1000)}
                          max={new Date()}
                          modal
                          renderTrigger={({ value, setOpen, open }) => (
                            <DateTimeInput
                              value={value}
                              onChange={field.onChange}
                              format='dd/MM/yyyy HH:mm'
                              onCalendarClick={() => setOpen(!open)}
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data zakończenia */}
                <FormField
                  control={form.control}
                  name='to'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Zakończenie</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          min={new Date(Date.now() - 8 * 3600 * 1000)}
                          max={new Date()}
                          modal
                          renderTrigger={({ value, setOpen, open }) => (
                            <DateTimeInput
                              value={value}
                              onChange={field.onChange}
                              format='dd/MM/yyyy HH:mm'
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
                  name='supervisor'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Nadzorujący</FormLabel>
                      <FormControl>
                        <Input placeholder='' {...field} />
                      </FormControl>
                      {/* <FormDescription>
                      This is your public display name.
                    </FormDescription> */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='responsible'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Odpowiedzialny</FormLabel>
                      <FormControl>
                        <Input placeholder='' {...field} />
                      </FormControl>
                      {/* <FormDescription>
                      This is your public display name.
                    </FormDescription> */}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='solution'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Rozwiązanie</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='comment'
                  render={({ field }) => (
                    <FormItem className=''>
                      <FormLabel>Komentarz</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogFormWithScroll>
            </DialogScrollArea>
            <DialogFormActions
              onCancel={() => setOpen(false)}
              isPending={isPendingUpdate}
              cancelLabel='Anuluj'
              submitLabel='Zapisz'
              submitIcon={<Save />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
