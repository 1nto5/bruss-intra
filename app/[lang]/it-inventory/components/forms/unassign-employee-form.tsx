'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import LocalizedLink from '@/components/localized-link';
import { toast } from 'sonner';
import { unassignEmployee } from '../../actions/assignment';
import { redirectToInventoryItem as redirect } from '../../actions/utils';
import { createUnassignEmployeeSchema } from '../../lib/zod';
import { Dictionary } from '../../lib/dict';
import { Locale } from '@/lib/config/i18n';
import { ITInventoryItem, EQUIPMENT_STATUSES } from '../../lib/types';
import * as z from 'zod';

export default function UnassignEmployeeForm({
  item,
  dict,
  lang,
}: {
  item: ITInventoryItem;
  dict: Dictionary;
  lang: Locale;
}) {
  const [isPending, setIsPending] = useState(false);

  const schema = createUnassignEmployeeSchema(dict.validation);
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      statuses: ['in-stock'],
    },
  });

  const assignmentName = item.currentAssignment
    ? item.currentAssignment.assignment.type === 'employee'
      ? `${item.currentAssignment.assignment.employee.firstName} ${item.currentAssignment.assignment.employee.lastName}`
      : item.currentAssignment.assignment.customName
    : '';

  async function onSubmit(data: FormData) {
    setIsPending(true);

    try {
      const result = await unassignEmployee(item._id, data);

      if ('error' in result) {
        toast.error(dict.toast.contactIT);
        setIsPending(false);
        return;
      }

      toast.success(dict.toast.unassigned);
      redirect(item._id, lang);
    } catch (error) {
      console.error(error);
      toast.error(dict.toast.error);
      setIsPending(false);
    }
  }

  if (!item.currentAssignment) {
    return (
      <Card className='sm:w-[768px]'>
        <CardHeader>
          <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
            <CardTitle>{dict.form.unassign.title}</CardTitle>
            <LocalizedLink href='/it-inventory'>
              <Button variant='outline'>
                <ArrowLeft /> <span>{dict.common.back}</span>
              </Button>
            </LocalizedLink>
          </div>
        </CardHeader>
        <Separator className='mb-4' />
        <CardContent>
          <p className="text-muted-foreground">{dict.details.unassigned}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <div>
            <CardTitle>{dict.form.unassign.title}</CardTitle>
            <CardDescription>
              {dict.form.unassign.description.replace('{employeeName}', assignmentName)}
            </CardDescription>
            <div className="text-sm text-muted-foreground pt-2">
              {dict.table.columns.assetId}: <strong>{item.assetId}</strong>
            </div>
          </div>
          <LocalizedLink href='/it-inventory'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.common.back}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* New Statuses */}
            <FormField
              control={form.control}
              name="statuses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.unassign.newStatuses}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={EQUIPMENT_STATUSES.map((status) => ({
                        value: status,
                        label: dict.statuses[status],
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={dict.common.select}
                      emptyText={dict.table.noResults}
                      clearLabel={dict.common.clear}
                      selectedLabel={dict.bulk.selected}
                    />
                  </FormControl>
                  <FormDescription>{dict.form.unassign.statusesDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason / Note */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.unassign.reason}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button type="submit" variant="destructive" disabled={isPending} className='w-full sm:w-auto'>
              <UserMinus />
              {dict.common.unassign}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
