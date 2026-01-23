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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Locale } from '@/lib/config/i18n';
import { EmployeeType } from '@/lib/types/employee-types';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  CircleX,
  Copy,
  Loader,
  Plus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertOrder } from '../actions/crud';
import { redirectToOrders } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { IndividualOvertimeOrderType } from '../lib/types';
import { createOrderSchema } from '../lib/zod';

interface AddOrderFormProps {
  employees?: EmployeeType[];
  loggedInUserEmail: string;
  dict: Dictionary;
  lang: Locale;
}

export default function AddOrderForm({
  employees = [],
  loggedInUserEmail,
  dict,
  lang,
}: AddOrderFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'save' | 'save-and-add-another'>(
    'save',
  );

  // Helper function to calculate next Saturday from a given date
  const getNextSaturday = (fromDate: Date = new Date()): Date => {
    const saturday = 6;
    const date = new Date(fromDate);
    const daysUntilSaturday = (saturday - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const orderSchema = createOrderSchema(dict.validation);

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      hours: 1,
      reason: '',
      payment: undefined,
      scheduledDayOff: undefined,
      workStartTime: undefined,
      workEndTime: undefined,
    },
  });

  // Calculate hours from time range
  const workStartTime = form.watch('workStartTime');
  const workEndTime = form.watch('workEndTime');

  useEffect(() => {
    if (workStartTime && workEndTime) {
      const durationMs = workEndTime.getTime() - workStartTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const roundedHours = Math.round(durationHours * 2) / 2;
      form.setValue('hours', roundedHours);
    }
  }, [workStartTime, workEndTime, form]);

  const onSubmit = async (
    data: z.infer<typeof orderSchema>,
    currentActionType: 'save' | 'save-and-add-another' = actionType,
  ) => {
    // Validate employee selection
    if (!selectedEmployee) {
      toast.error(dict.validation.employeeRequired || 'Employee is required');
      return;
    }

    setIsPending(true);
    try {
      const orderData = data as unknown as IndividualOvertimeOrderType;

      // Pass the selected employee
      const res = await insertOrder(orderData, selectedEmployee);

      if ('success' in res) {
        if (currentActionType === 'save-and-add-another') {
          toast.success(dict.toast.submissionSaved);
          const currentValues = form.getValues();
          form.reset({
            ...currentValues,
            reason: '',
          });
          // Keep selectedEmployee for consecutive submissions
        } else {
          toast.success(dict.toast.submissionAdded);
          form.reset();
          setSelectedEmployee(null);
          redirectToOrders(lang);
        }
      } else if ('error' in res) {
        console.error(res.error);
        const errorMsg = res.error;
        if (errorMsg === 'unauthorized') {
          toast.error(dict.errors.unauthorized);
        } else if (errorMsg === 'employee not found') {
          toast.error(dict.errors.employeeNotFound);
        } else if (errorMsg === 'not found') {
          toast.error(dict.errors.notFound);
        } else if (errorMsg === 'not inserted') {
          toast.error(dict.errors.notInserted);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  const handleSaveAndAddAnother = () => {
    setActionType('save-and-add-another');
    form.handleSubmit((data) => onSubmit(data, 'save-and-add-another'))();
  };

  const handleRegularSave = () => {
    setActionType('save');
    form.handleSubmit((data) => onSubmit(data, 'save'))();
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.form.titleNew}</CardTitle>
          <LocalizedLink href='/individual-overtime-orders'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.backToOrders}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>

      <Separator className='mb-4' />
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegularSave();
          }}
        >
          <CardContent className='grid w-full items-center gap-4'>
            {/* Employee selector */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>{dict.form.employee}</label>
              <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    className={cn(
                      'w-full justify-between',
                      !selectedEmployee && 'text-muted-foreground',
                    )}
                  >
                    {selectedEmployee
                      ? (() => {
                          const emp = employees.find(
                            (e) => e.identifier === selectedEmployee,
                          );
                          return emp
                            ? `${emp.firstName} ${emp.lastName} (${emp.identifier})`
                            : dict.filters.select;
                        })()
                      : dict.filters.select}
                    <ChevronsUpDown className='shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='p-0' side='bottom' align='start'>
                  <Command>
                    <CommandInput placeholder={dict.filters.searchPlaceholder} />
                    <CommandList>
                      <CommandEmpty>{dict.form.employeeNotFound}</CommandEmpty>
                      <CommandGroup className='max-h-48 overflow-y-auto'>
                        {employees.map((emp) => (
                          <CommandItem
                            value={`${emp.identifier}${emp.firstName}${emp.lastName}`}
                            key={emp.identifier}
                            onSelect={() => {
                              setSelectedEmployee(emp.identifier);
                              setEmployeeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                emp.identifier === selectedEmployee
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            {emp.firstName} {emp.lastName} ({emp.identifier})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <FormField
              control={form.control}
              name='workStartTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.workStartTime}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={
                        field.value ||
                        (() => {
                          const defaultDate = getNextSaturday(
                            new Date(Date.now() + 8 * 3600 * 1000),
                          );
                          return defaultDate;
                        })()
                      }
                      onChange={(date) => {
                        field.onChange(date);
                        const currentEndDate = form.getValues('workEndTime');
                        if (date && currentEndDate && date > currentEndDate) {
                          const newEndDate = new Date(date);
                          newEndDate.setHours(currentEndDate.getHours());
                          newEndDate.setMinutes(currentEndDate.getMinutes());
                          newEndDate.setSeconds(currentEndDate.getSeconds());
                          form.setValue('workEndTime', newEndDate);
                        }
                      }}
                      min={new Date(Date.now() + 8 * 3600 * 1000)}
                      minuteStep={30}
                      timePicker={{
                        hour: true,
                        minute: true,
                        second: false,
                      }}
                      renderTrigger={({ value, setOpen, open }) => (
                        <DateTimeInput
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            const currentEndDate =
                              form.getValues('workEndTime');
                            if (
                              date &&
                              currentEndDate &&
                              date > currentEndDate
                            ) {
                              const newEndDate = new Date(date);
                              newEndDate.setHours(currentEndDate.getHours());
                              newEndDate.setMinutes(
                                currentEndDate.getMinutes(),
                              );
                              newEndDate.setSeconds(
                                currentEndDate.getSeconds(),
                              );
                              form.setValue('workEndTime', newEndDate);
                            }
                          }}
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
              name='workEndTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.workEndTime}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={
                        field.value ||
                        (workStartTime
                          ? new Date(workStartTime.getTime() + 3600 * 1000)
                          : getNextSaturday(
                              new Date(Date.now() + 8 * 3600 * 1000),
                            ))
                      }
                      onChange={field.onChange}
                      min={new Date(Date.now() + 8 * 3600 * 1000)}
                      minuteStep={30}
                      timePicker={{
                        hour: true,
                        minute: true,
                        second: false,
                      }}
                      renderTrigger={({ value, setOpen, open }) => (
                        <DateTimeInput
                          value={field.value}
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
              name='hours'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.hours}</FormLabel>
                  <FormDescription>
                    {dict.form.hoursDescription}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      step={0.5}
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === ''
                            ? ''
                            : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      value={
                        field.value === undefined || isNaN(field.value)
                          ? ''
                          : String(field.value)
                      }
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.reason}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('payment') !== true && (
              <FormField
                control={form.control}
                name='scheduledDayOff'
                render={({ field }) => {
                  const baseDate = workStartTime || new Date();
                  const minPickupDate = new Date(baseDate);
                  minPickupDate.setDate(minPickupDate.getDate() + 1);
                  return (
                    <FormItem>
                      <FormLabel>{dict.form.scheduledDayOff}</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          modal
                          hideTime
                          value={
                            field.value ||
                            (workStartTime
                              ? new Date(workStartTime.getTime() + 3600 * 1000)
                              : getNextSaturday(
                                  new Date(Date.now() + 8 * 3600 * 1000),
                                ))
                          }
                          onChange={field.onChange}
                          min={minPickupDate}
                          renderTrigger={({ open, value, setOpen }) => (
                            <DateTimeInput
                              value={field.value}
                              onChange={(x) => !open && field.onChange(x)}
                              format='dd/MM/yyyy'
                              disabled={open}
                              onCalendarClick={() => setOpen(!open)}
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            <FormField
              control={form.control}
              name='payment'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.payment}</FormLabel>
                  <FormControl>
                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        id='payment-switch'
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator className='mb-4' />

          <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button
              variant='destructive'
              type='button'
              onClick={() => form.reset()}
              className='w-full sm:w-auto'
            >
              <CircleX />
              {dict.filters.clear}
            </Button>

            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
              <Button
                type='button'
                variant='secondary'
                onClick={handleSaveAndAddAnother}
                disabled={isPending}
                className='w-full sm:w-auto'
              >
                {isPending && actionType === 'save-and-add-another' ? (
                  <Loader className='animate-spin' />
                ) : (
                  <Copy />
                )}
                {dict.actions.saveAndAddAnother}
              </Button>

              <Button
                type='button'
                onClick={handleRegularSave}
                className='w-full sm:w-auto'
                disabled={isPending}
              >
                {isPending && actionType === 'save' ? (
                  <Loader className='animate-spin' />
                ) : (
                  <Plus />
                )}
                {dict.actions.add}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
