'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, Pencil, Save } from 'lucide-react';
import { FailureType } from '../lib/types';
import { EmployeeType } from '@/lib/types/employee-types';

import { createUpdateFailureSchema } from '../lib/zod';
import { Dictionary } from '../../../lib/dict';
import DialogFormWithScroll from '@/components/dialog-form-with-scroll';
import DialogScrollArea from '@/components/dialog-scroll-area';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Locale } from '@/lib/config/i18n';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { updateFailure } from '../actions/crud';

export default function EditFailureDialog({
  failure,
  employees,
  lang,
  dict,
}: {
  failure: FailureType;
  employees: EmployeeType[];
  lang: Locale;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);
  const [openSupervisor, setOpenSupervisor] = useState(false);
  const [openResponsible, setOpenResponsible] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');

  const sortedEmployees = [...employees].sort((a, b) =>
    a.lastName !== b.lastName
      ? a.lastName.localeCompare(b.lastName)
      : a.firstName.localeCompare(b.firstName),
  );

  const updateFailureSchema = createUpdateFailureSchema(dict.validation);

  const form = useForm<z.infer<typeof updateFailureSchema>>({
    resolver: zodResolver(updateFailureSchema),
    defaultValues: {
      _id: failure._id,
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
        _id: failure._id,
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
    setIsPendingUpdate(true);
    try {
      const res = await updateFailure(data, lang);
      if ('success' in res) {
        toast.success('Awaria zapisana!');
        form.reset();
        setOpen(false);
      } else if (res.error === 'validation' && res.issues) {
        toast.error(res.issues[0]?.message || dict.form.contactIT);
      } else {
        console.error(res.error);
        toast.error(dict.form.contactIT);
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.form.contactIT);
    } finally {
      setIsPendingUpdate(false);
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
                <FormField
                  control={form.control}
                  name='from'
                  render={({ field }) => (
                    <FormItem>
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

                <FormField
                  control={form.control}
                  name='to'
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
                      <div className='flex flex-col items-start space-y-2'>
                        <FormLabel>{dict.form.supervisor}</FormLabel>
                        <FormControl>
                          <Popover
                            open={openSupervisor}
                            onOpenChange={setOpenSupervisor}
                            modal={true}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'w-full justify-between',
                                  !field.value && 'opacity-50',
                                )}
                              >
                                {field.value || dict.form.select}
                                <ChevronsUpDown className='shrink-0 opacity-50' />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='p-0'
                              side='bottom'
                              align='start'
                            >
                              <Command>
                                <CommandInput
                                  placeholder={dict.form.searchPlaceholder}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {dict.form.notFound}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {sortedEmployees.map((emp) => {
                                      const fullName = `${emp.firstName} ${emp.lastName}`;
                                      return (
                                        <CommandItem
                                          key={emp.identifier}
                                          value={fullName}
                                          onSelect={(currentValue) => {
                                            form.setValue(
                                              'supervisor',
                                              currentValue,
                                            );
                                            setOpenSupervisor(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              field.value === fullName
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {fullName}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='responsible'
                  render={({ field }) => (
                    <FormItem>
                      <div className='flex flex-col items-start space-y-2'>
                        <FormLabel>{dict.form.responsible}</FormLabel>
                        <FormControl>
                          <Popover
                            open={openResponsible}
                            onOpenChange={setOpenResponsible}
                            modal={true}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'w-full justify-between',
                                  !field.value && 'opacity-50',
                                )}
                              >
                                {field.value || dict.form.select}
                                <ChevronsUpDown className='shrink-0 opacity-50' />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='p-0'
                              side='bottom'
                              align='start'
                            >
                              <Command>
                                <CommandInput
                                  placeholder={dict.form.searchPlaceholder}
                                  onValueChange={setResponsibleSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {dict.form.notFound}
                                  </CommandEmpty>
                                  {responsibleSearch && (
                                    <CommandGroup forceMount>
                                      <CommandItem
                                        forceMount
                                        value={`__custom::${responsibleSearch}`}
                                        onSelect={() => {
                                          form.setValue(
                                            'responsible',
                                            responsibleSearch,
                                          );
                                          setOpenResponsible(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value === responsibleSearch
                                              ? 'opacity-100'
                                              : 'opacity-0',
                                          )}
                                        />
                                        {responsibleSearch}
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                  <CommandGroup>
                                    {sortedEmployees.map((emp) => {
                                      const fullName = `${emp.firstName} ${emp.lastName}`;
                                      return (
                                        <CommandItem
                                          key={emp.identifier}
                                          value={fullName}
                                          onSelect={(currentValue) => {
                                            form.setValue(
                                              'responsible',
                                              currentValue,
                                            );
                                            setOpenResponsible(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              field.value === fullName
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {fullName}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='solution'
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
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
