'use client';

import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Locale } from '@/lib/config/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertEmployee, updateEmployee } from '../actions/crud';
import { redirectToEmployees } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { ManagedEmployee } from '../lib/types';
import { createEmployeeSchema } from '../lib/zod';

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  employee?: ManagedEmployee;
  dict: Dictionary;
  lang: Locale;
}

export default function EmployeeForm({
  mode,
  employee,
  dict,
  lang,
}: EmployeeFormProps) {
  const [isPending, setIsPending] = useState(false);
  const schema = createEmployeeSchema(dict.validation);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: employee?.identifier ?? '',
      firstName: employee?.firstName ?? '',
      lastName: employee?.lastName ?? '',
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsPending(true);
    try {
      const res =
        mode === 'create'
          ? await insertEmployee(data, lang)
          : await updateEmployee(employee!._id, data, lang);

      if ('success' in res) {
        toast.success(
          mode === 'create' ? dict.toast.inserted : dict.toast.updated,
        );
        redirectToEmployees(lang);
      } else if ('error' in res) {
        if (res.error === 'validation' && res.issues) {
          toast.error(res.issues[0]?.message || dict.errors.contactIT);
        } else if (res.error === 'unauthorized') {
          toast.error(dict.errors.unauthorized);
        } else if (res.error === 'duplicate identifier') {
          toast.error(dict.errors.duplicateIdentifier);
        } else if (res.error === 'not found') {
          toast.error(dict.errors.notFound);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch {
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>
            {mode === 'create' ? dict.form.titleNew : dict.form.titleEdit}
          </CardTitle>
          <LocalizedLink href='/employee-management'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.form.backToList}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className='grid w-full items-center gap-4'>
            <FormField
              control={form.control}
              name='identifier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.identifier}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === 'edit'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.firstName}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.lastName}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <Separator className='mb-4' />
          <CardFooter className='flex justify-end'>
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <Loader className='animate-spin' />
              ) : mode === 'create' ? (
                <Plus />
              ) : (
                <Save />
              )}
              {dict.actions.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
