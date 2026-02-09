'use client';

import { createAddFailureSchema } from '../lib/zod';
import { Dictionary } from '../../../lib/dict';
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

import { Check, ChevronsUpDown, CopyPlus } from 'lucide-react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import DialogFormWithScroll from '@/components/dialog-form-with-scroll';
import DialogScrollArea from '@/components/dialog-scroll-area';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Locale } from '@/lib/config/i18n';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertFailure } from '../actions/crud';
import { FailureOptionType } from '../lib/types';
import { EmployeeType } from '@/lib/types/employee-types';

export default function AddFailureDialog({
  failuresOptions,
  employees,
  lang,
  dict,
}: {
  failuresOptions: FailureOptionType[];
  employees: EmployeeType[];
  lang: Locale;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [isPendingInsert, setIsPendingInserting] = useState(false);

  const [openStation, setOpenStation] = useState(false);
  const [openFailure, setOpenFailure] = useState(false);
  const [openSupervisor, setOpenSupervisor] = useState(false);
  const [openResponsible, setOpenResponsible] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');

  const sortedEmployees = [...employees].sort((a, b) =>
    a.lastName !== b.lastName
      ? a.lastName.localeCompare(b.lastName)
      : a.firstName.localeCompare(b.firstName),
  );

  const addFailureSchema = createAddFailureSchema(dict.validation);

  const form = useForm<z.infer<typeof addFailureSchema>>({
    resolver: zodResolver(addFailureSchema),
    defaultValues: {
      line: '',
      responsible: '',
      supervisor: '',
      from: new Date(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        line: '',
        responsible: '',
        supervisor: '',
        from: new Date(),
      });
    }
  }, [open]);

  const selectedStation = form.watch('station');
  const selectedLine = form.watch('line');

  useEffect(() => {
    form.setValue('station', '');
    form.setValue('failure', '');
  }, [selectedLine]);

  useEffect(() => {
    form.setValue('failure', '');
  }, [selectedStation]);

  const selectedFailure = form.watch('failure');

  const filteredStations = failuresOptions
    .filter((option) => option.line === selectedLine)
    .sort((a, b) => a.station.localeCompare(b.station));

  const filteredFailures = (
    filteredStations.filter((option) => option.station === selectedStation)[0]
      ?.options || []
  ).sort((a, b) => a.localeCompare(b));

  const onSubmit = async (data: z.infer<typeof addFailureSchema>) => {
    setIsPendingInserting(true);
    try {
      const res = await insertFailure(data, lang);
      if ('success' in res) {
        toast.success(dict.toasts.failureAdded);
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
      setIsPendingInserting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' title={dict.addFailure}>
          <CopyPlus /> <span>{dict.addFailure}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>
            {dict.form.newFailure}{' '}
            {selectedLine && dict.form.onLine + ' ' + selectedLine.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogScrollArea>
              <DialogFormWithScroll>
                {!selectedLine && (
                  <FormField
                    control={form.control}
                    name='line'
                    render={({ field }) => (
                      <FormItem className='mb-2 space-y-3'>
                        <FormLabel>{dict.form.line}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='flex flex-col space-y-1'
                          >
                            <FormItem className='flex items-center space-y-0 space-x-3'>
                              <FormControl>
                                <RadioGroupItem value='lv1' />
                              </FormControl>
                              <FormLabel className='font-normal'>LV1</FormLabel>
                            </FormItem>
                            <FormItem className='flex items-center space-y-0 space-x-3'>
                              <FormControl>
                                <RadioGroupItem value='lv2' />
                              </FormControl>
                              <FormLabel className='font-normal'>LV2</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {selectedLine && (
                  <>
                    <FormField
                      control={form.control}
                      name='station'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex flex-col items-start space-y-2'>
                            <FormLabel>{dict.form.station}</FormLabel>
                            <FormControl>
                              <Popover
                                open={openStation}
                                onOpenChange={setOpenStation}
                                modal={true}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant='outline'
                                    role='combobox'
                                    disabled={!selectedLine}
                                    className={cn(
                                      'w-full justify-between',
                                      !form.getValues('station') &&
                                        'opacity-50',
                                    )}
                                  >
                                    {selectedStation
                                      ? selectedStation
                                      : dict.form.select}
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
                                        <CommandItem
                                          key='reset'
                                          onSelect={() => {
                                            form.setValue('station', '');
                                            setOpenStation(false);
                                          }}
                                        >
                                          <Check className='opacity-0' />
                                          {dict.form.notSelected}
                                        </CommandItem>
                                        {filteredStations.map((option) => (
                                          <CommandItem
                                            key={option.station}
                                            value={option.station}
                                            onSelect={(currentValue) => {
                                              form.setValue(
                                                'station',
                                                currentValue,
                                              );
                                              setOpenStation(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                form.getValues('station') ===
                                                  option.station
                                                  ? 'opacity-100'
                                                  : 'opacity-0',
                                              )}
                                            />
                                            {option.station}
                                          </CommandItem>
                                        ))}
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
                      name='failure'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex flex-col items-start space-y-2'>
                            <FormLabel>{dict.form.failure}</FormLabel>
                            <FormControl>
                              <Popover
                                open={openFailure}
                                onOpenChange={setOpenFailure}
                                modal={true}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant='outline'
                                    role='combobox'
                                    className={cn(
                                      'w-full justify-between',
                                      !form.getValues('failure') &&
                                        'opacity-50',
                                    )}
                                    disabled={!selectedStation}
                                  >
                                    {selectedFailure
                                      ? selectedFailure
                                      : dict.form.select}
                                    <ChevronsUpDown className='shrink-0 opacity-50' />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  side='bottom'
                                  align='start'
                                  className='p-0'
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
                                        <CommandItem
                                          key='reset'
                                          onSelect={() => {
                                            form.setValue('failure', '');
                                            setOpenFailure(false);
                                          }}
                                        >
                                          <Check className='opacity-0' />
                                          {dict.form.notSelected}
                                        </CommandItem>
                                        {filteredFailures.map((failure) => (
                                          <CommandItem
                                            key={failure}
                                            value={failure}
                                            onSelect={(currentValue) => {
                                              form.setValue(
                                                'failure',
                                                currentValue,
                                              );
                                              setOpenFailure(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                form.getValues('failure') ===
                                                  failure
                                                  ? 'opacity-100'
                                                  : 'opacity-0',
                                              )}
                                            />
                                            {failure}
                                          </CommandItem>
                                        ))}
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
                      name='from'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dict.form.start}</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              max={new Date(Date.now())}
                              min={new Date(Date.now() - 3600 * 1000)}
                              modal
                              value={field.value}
                              onChange={field.onChange}
                              timePicker={{ hour: true, minute: true }}
                              renderTrigger={({ open, value, setOpen }) => (
                                <DateTimeInput
                                  value={value}
                                  onChange={(x) => !open && field.onChange(x)}
                                  format='dd/MM/yyyy HH:mm'
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
                                                field.value ===
                                                  responsibleSearch
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
                          <FormLabel>{dict.form.solution}</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='comment'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{dict.form.comment}</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </DialogFormWithScroll>
            </DialogScrollArea>
            <DialogFormActions
              onCancel={() => setOpen(false)}
              isPending={isPendingInsert}
              cancelLabel='Anuluj'
              submitLabel={dict.addFailure}
              submitIcon={<CopyPlus />}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
