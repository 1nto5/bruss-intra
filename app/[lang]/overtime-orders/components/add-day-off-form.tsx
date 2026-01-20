'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EmployeeType } from '@/lib/types/employee-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CircleX, Plus } from 'lucide-react';
import { useState } from 'react';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { addEmployeeDayOff } from '../actions/pickups';
import { redirectToOvertimeOrdersDaysOff as redirect } from '../actions/utils';
import { overtimeRequestEmployeeType } from '../lib/types';
import { MultiSelectEmployees } from './multi-select-employees';
import { Dictionary } from '../lib/dict';
import { Locale } from '@/lib/config/i18n';

const AddEmployeeSchema = z.object({
  employeesToAdd: z.array(
    z.object({
      identifier: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      agreedReceivingAt: z.date().optional(),
      note: z.string().optional(),
    }),
  ),
});

export default function AddDayOff({
  employees,
  id,
  dict,
  lang,
}: {
  employees: EmployeeType[];
  id: string;
  dict: Dictionary;
  lang: Locale;
}) {
  const [isPendingInsert, setIsPendingInserting] = useState(false);

  const form = useForm<z.infer<typeof AddEmployeeSchema>>({
    resolver: zodResolver(AddEmployeeSchema),
    defaultValues: {
      employeesToAdd: [],
    },
  });

  const onSubmit = async (data: z.infer<typeof AddEmployeeSchema>) => {
    if (data.employeesToAdd.length === 0) {
      toast.error(dict.addDayOffForm.toast.selectAtLeastOne);
      return;
    }

    setIsPendingInserting(true);
    try {
      // Dodajemy każdego pracownika osobno
      for (const employee of data.employeesToAdd) {
        const res = await addEmployeeDayOff(
          id,
          employee as overtimeRequestEmployeeType,
        );
        if ('error' in res) {
          if (res.error === 'too many employees with scheduled days off') {
            toast.error(dict.addDayOffForm.toast.tooManyEmployees);
          } else if (res.error === 'unauthorized') {
            toast.error(dict.addDayOffForm.toast.unauthorized);
          } else if (res.error === 'employee already exists') {
            toast.error(
              dict.addDayOffForm.toast.employeeExists
                .replace('{firstName}', employee.firstName)
                .replace('{lastName}', employee.lastName),
            );
          } else {
            console.error(res.error);
            toast.error(dict.addDayOffForm.toast.error);
          }
          return;
        }
      }
      toast.success(dict.addDayOffForm.toast.success);
      redirect(id, lang);
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.addDayOffForm.toast.contactIT);
    } finally {
      setIsPendingInserting(false);
    }
  };

  return (
    <Card className='sm:w-[896px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.addDayOffForm.title}</CardTitle>
          <LocalizedLink href={`/overtime-orders/${id}/pickups`}>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.addDayOffForm.backToRequest}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className='grid w-full items-center gap-4'>
          <MultiSelectEmployees
            employees={employees}
            value={form.watch('employeesToAdd')}
            onSelectChange={(selectedEmployees) => {
              form.setValue('employeesToAdd', selectedEmployees);
            }}
            placeholder={dict.addDayOffForm.searchPlaceholder}
            dict={dict}
          />
        </CardContent>
        <Separator className='mb-4' />

        <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
          <Button
            variant='destructive'
            type='button'
            onClick={() => form.reset()}
            disabled={form.watch('employeesToAdd').length === 0}
            className='w-full sm:w-auto'
          >
            <CircleX className='' />
            {dict.common.clear}
          </Button>
          <div className='flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:space-x-2'>
            <Button
              type='submit'
              className='w-full sm:w-auto'
              disabled={
                isPendingInsert || form.watch('employeesToAdd').length === 0
              }
            >
              <Plus className={isPendingInsert ? 'animate-spin' : ''} />
              {form.watch('employeesToAdd').length === 1
                ? dict.addDayOffForm.addEmployee
                : dict.addDayOffForm.addEmployees}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
