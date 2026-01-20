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
import { FormSection } from '@/components/ui/form-section';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Locale } from '@/lib/config/i18n';
import { UsersListType } from '@/lib/types/user';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  CircleX,
  Copy,
  Plus,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  editOvertimeSubmission as edit,
  insertOvertimeSubmission as insert,
  updateOvertimeSubmission as update,
} from '../actions/crud';
import { redirectToOvertime as redirect } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { OvertimeSubmissionType } from '../lib/types';
import { createWorkOrderSchema } from '../lib/zod';

interface AddWorkOrderFormProps {
  managers: UsersListType;
  users?: UsersListType;
  loggedInUserEmail: string;
  mode: 'new' | 'edit';
  submission?: OvertimeSubmissionType;
  dict: Dictionary;
  lang: Locale;
  requiresReapproval?: boolean;
  isHROrAdmin?: boolean;
}

export default function AddWorkOrderForm({
  managers,
  users = [],
  loggedInUserEmail,
  mode,
  submission,
  dict,
  lang,
  requiresReapproval = false,
  isHROrAdmin = false,
}: AddWorkOrderFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'save' | 'save-and-add-another'>(
    'save',
  );

  const isEditMode = mode === 'edit';

  // Helper function to calculate next Saturday from a given date
  const getNextSaturday = (fromDate: Date = new Date()): Date => {
    const saturday = 6;
    const date = new Date(fromDate);
    const daysUntilSaturday = (saturday - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const workOrderSchema = createWorkOrderSchema(dict.validation);

  const form = useForm<z.infer<typeof workOrderSchema>>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      supervisor: isEditMode ? submission!.supervisor : '',
      hours: isEditMode ? submission!.hours : 1,
      reason: isEditMode ? submission!.reason : '',
      payment: isEditMode ? submission!.payment : undefined,
      scheduledDayOff: isEditMode
        ? submission!.scheduledDayOff
          ? new Date(submission!.scheduledDayOff)
          : undefined
        : undefined,
      workStartTime: isEditMode
        ? (submission as any)?.workStartTime
          ? new Date((submission as any).workStartTime)
          : undefined
        : undefined,
      workEndTime: isEditMode
        ? (submission as any)?.workEndTime
          ? new Date((submission as any).workEndTime)
          : undefined
        : undefined,
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
    data: z.infer<typeof workOrderSchema>,
    currentActionType: 'save' | 'save-and-add-another' = actionType,
  ) => {
    setIsPending(true);
    try {
      let submissionData: any = { ...data };

      // Set overtimeRequest to true for work orders
      submissionData.overtimeRequest = true;
      
      // Date should not be set for overtime requests
      delete submissionData.date;

      const finalData = submissionData as OvertimeSubmissionType;

      let res;
      if (isEditMode) {
        if (requiresReapproval) {
          res = await edit(submission!._id, finalData);
        } else {
          res = await update(submission!._id, finalData);
        }
      } else {
        // Pass onBehalfOf if HR/Admin selected an employee
        res = await insert(finalData, selectedEmployee || undefined);
      }

      if ('success' in res) {
        const successMessage = isEditMode
          ? dict.toast.submissionUpdated
          : dict.toast.submissionAdded;

        if (!isEditMode) {
          if (currentActionType === 'save-and-add-another') {
            toast.success(dict.toast.submissionSaved);
            const currentValues = form.getValues();
            form.reset({
              ...currentValues,
              reason: '',
            });
            // Keep selectedEmployee for consecutive submissions
          } else {
            toast.success(successMessage);
            form.reset();
            setSelectedEmployee(null);
            redirect(lang);
          }
        } else {
          toast.success(successMessage);
          redirect(lang);
        }
      } else if ('error' in res) {
        console.error(res.error);
        const errorMsg = res.error;
        if (errorMsg === 'unauthorized') {
          toast.error(dict.errors.unauthorized);
        } else if (errorMsg === 'not found') {
          toast.error(dict.errors.notFound);
        } else if (errorMsg === 'invalid status') {
          toast.error(dict.errors.cannotEditApprovedOrRejected);
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

  const getTitle = () => {
    return isEditMode ? dict.form.titleEdit : dict.form.titleNewWorkOrder;
  };

  const getSubmitButtonText = () => {
    return isEditMode ? dict.actions.save : dict.actions.add;
  };

  const getSubmitButtonIcon = () => {
    return isEditMode ? Save : Plus;
  };

  const SubmitIcon = getSubmitButtonIcon();

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{getTitle()}</CardTitle>
          <LocalizedLink href='/overtime-submissions'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.backToSubmissions}</span>
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
            {/* Employee selector for HR/Admin - only show in new mode */}
            {isHROrAdmin && !isEditMode && (
              <div className='space-y-2'>
                <label className='text-sm font-medium'>{dict.form.onBehalfOf}</label>
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
                        ? users.find((user) => user.email === selectedEmployee)?.name
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
                          {users.map((user) => (
                            <CommandItem
                              value={user.name}
                              key={user.email}
                              onSelect={() => {
                                setSelectedEmployee(user.email);
                                setEmployeeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  user.email === selectedEmployee
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {user.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <FormField
              control={form.control}
              name='supervisor'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.supervisor}</FormLabel>
                  <Popover
                    open={supervisorOpen}
                    onOpenChange={setSupervisorOpen}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          role='combobox'
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value
                            ? managers.find(
                                (manager) => manager.email === field.value,
                              )?.name
                            : dict.filters.select}
                          <ChevronsUpDown className='shrink-0 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='p-0' side='bottom' align='start'>
                      <Command>
                        <CommandInput
                          placeholder={dict.filters.searchPlaceholder}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {dict.form.managerNotFound}
                          </CommandEmpty>
                          <CommandGroup className='max-h-48 overflow-y-auto'>
                            {managers.map((manager) => (
                              <CommandItem
                                value={manager.name}
                                key={manager.email}
                                onSelect={() => {
                                  form.setValue('supervisor', manager.email);
                                  setSupervisorOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    manager.email === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {manager.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='workStartTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {(dict.form as any).workStartTime || 'Work Start'}
                  </FormLabel>
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
                  <FormLabel>
                    {(dict.form as any).workEndTime || 'Work End'}
                  </FormLabel>
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
                        disabled={
                          isEditMode && submission?.status !== 'pending'
                        }
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
            {isEditMode ? (
              <LocalizedLink href='/overtime-submissions'>
                <Button
                  variant='destructive'
                  type='button'
                  className='w-full sm:w-auto'
                >
                  <CircleX />
                  {dict.actions.cancel}
                </Button>
              </LocalizedLink>
            ) : (
              <Button
                variant='destructive'
                type='button'
                onClick={() => form.reset()}
                className='w-full sm:w-auto'
              >
                <CircleX />
                {dict.filters.clear}
              </Button>
            )}

            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
              {!isEditMode && (
                <Button
                  type='button'
                  variant='secondary'
                  onClick={handleSaveAndAddAnother}
                  disabled={isPending}
                  className='w-full sm:w-auto'
                >
                  <Copy
                    className={
                      isPending && actionType === 'save-and-add-another'
                        ? 'animate-spin'
                        : ''
                    }
                  />
                  {dict.actions.saveAndAddAnother}
                </Button>
              )}

              <Button
                type='button'
                onClick={handleRegularSave}
                className='w-full sm:w-auto'
                disabled={isPending}
              >
                <SubmitIcon
                  className={
                    isPending && actionType === 'save' ? 'animate-spin' : ''
                  }
                />
                {getSubmitButtonText()}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
