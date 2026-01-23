'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleX, Loader, Plus, Table } from 'lucide-react';
import { useState } from 'react';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  insertProjectsEntry as insert,
  redirectToProjects as redirect,
} from '../../actions';
import { ProjectsSchema } from '../../lib/zod';
import { Locale } from '@/lib/config/i18n';

export default function NewEntryForm({ lang }: { lang: Locale }) {
  const [isPendingInsert, setIsPendingInserting] = useState(false);

  const form = useForm<z.infer<typeof ProjectsSchema>>({
    resolver: zodResolver(ProjectsSchema) as any,
    defaultValues: {
      scope: '',
      date: (() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0); // Set time to 12:00
        return today;
      })(),
      time: 1,
      note: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof ProjectsSchema>) => {
    setIsPendingInserting(true);
    try {
      const res = await insert(data);
      if ('success' in res) {
        toast.success('Entry added!');
        form.reset(); // Reset form after successful submission
        redirect(lang);
      } else if ('error' in res) {
        console.error(res.error);
        toast.error('Contact IT support!');
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error('Contact IT support!');
    } finally {
      setIsPendingInserting(false);
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>New Work Entry</CardTitle>
          <LocalizedLink href='/projects'>
            <Button variant='outline'>
              <Table /> <span>All Entries</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className='grid w-full items-center gap-4'>
            <FormField
              control={form.control}
              name='date'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      hideTime
                      renderTrigger={({ value, setOpen, open }) => (
                        <DateTimeInput
                          value={value}
                          onChange={field.onChange}
                          format='dd/MM/yyyy'
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
              name='time'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time (hours)</FormLabel>
                  <FormControl>
                    <Input
                      className='w-full rounded-md border p-2'
                      type='number'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='scope'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Scope</FormLabel>
                  <FormControl>
                    <Textarea className='' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea className='' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button
              variant='destructive'
              type='button'
              onClick={() => form.reset()}
              className='w-full sm:w-auto'
            >
              <CircleX className='' />
              Clear
            </Button>
            <div className='flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:space-x-2'>
              <Button
                type='submit'
                className='w-full sm:w-auto'
                disabled={isPendingInsert}
              >
                {isPendingInsert ? <Loader className='animate-spin' /> : <Plus />}
                Add Entry
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
