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
import { UsersListType } from '@/lib/types/user';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import { extractFullNameFromEmail } from '@/lib/utils/name-format';
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { correctOvertimeSubmission } from '../actions/crud';
import { redirectToOvertimeSubmission } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { OvertimeSubmissionType } from '../lib/types';
import { createWorkOrderCorrectionSchema } from '../lib/zod';

interface CorrectWorkOrderFormProps {
  managers: UsersListType;
  loggedInUserEmail: string;
  submission: OvertimeSubmissionType;
  dict: Dictionary;
  lang: Locale;
  fromDetails?: boolean;
  returnUrl?: string;
}

export default function CorrectWorkOrderForm({
  managers,
  loggedInUserEmail,
  submission,
  dict,
  lang,
  fromDetails = false,
  returnUrl,
}: CorrectWorkOrderFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [markAsCancelled, setMarkAsCancelled] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  // Include current supervisor in list even if they lost their role
  const managersWithCurrent = useMemo(() => {
    if (!submission.supervisor) return managers;
    const exists = managers.some((m) => m.email === submission.supervisor);
    if (exists) return managers;
    return [
      ...managers,
      {
        _id: submission.supervisor,
        email: submission.supervisor,
        name: extractFullNameFromEmail(submission.supervisor),
      },
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [managers, submission.supervisor]);

  const workOrderCorrectionSchema = createWorkOrderCorrectionSchema(
    dict.validation,
  );

  const form = useForm<z.infer<typeof workOrderCorrectionSchema>>({
    resolver: zodResolver(workOrderCorrectionSchema),
    defaultValues: {
      supervisor: submission.supervisor,
      hours: submission.hours,
      reason: submission.reason || '',
      payment: submission.payment,
      scheduledDayOff: submission.scheduledDayOff
        ? new Date(submission.scheduledDayOff)
        : undefined,
      workStartTime: submission.workStartTime
        ? new Date(submission.workStartTime)
        : undefined,
      workEndTime: submission.workEndTime
        ? new Date(submission.workEndTime)
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
    values: z.infer<typeof workOrderCorrectionSchema>,
  ) => {
    if (!correctionReason.trim()) {
      toast.error(dict.errors.correctionReasonRequired);
      return;
    }

    setIsPending(true);

    let dataToSubmit: any = {
      ...submission,
      ...values,
      overtimeRequest: true,
      _id: submission._id,
    };

    // Date should not be set for overtime requests
    delete dataToSubmit.date;

    const result = await correctOvertimeSubmission(
      submission._id,
      dataToSubmit,
      correctionReason,
      markAsCancelled,
    );

    setIsPending(false);

    if ('error' in result) {
      let errorMessage = dict.errors.contactIT;
      if (result.error === 'unauthorized') {
        errorMessage = dict.errors.unauthorized;
      } else if (result.error === 'not found') {
        errorMessage = dict.errors.notFound;
      } else if (result.error === 'cannot correct accounted') {
        errorMessage = dict.errors.cannotCorrectAccounted;
      }
      toast.error(errorMessage);
    } else {
      toast.success(dict.toast.correctionSaved);
      redirectToOvertimeSubmission(submission._id, lang);
    }
  };

  const paymentValue = form.watch('payment');

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle>
            {dict.correctPage.title}
            {submission.internalId && ` - ${submission.internalId}`}
          </CardTitle>
          {fromDetails ? (
            <LocalizedLink
              href={
                returnUrl
                  ? `/overtime-submissions/${submission._id}?returnUrl=${returnUrl}`
                  : `/overtime-submissions/${submission._id}`
              }
            >
              <Button variant='outline' type='button'>
                <ArrowLeft />
                {dict.correctPage.backToDetails}
              </Button>
            </LocalizedLink>
          ) : (
            <LocalizedLink
              href={returnUrl ? decodeURIComponent(returnUrl) : '/overtime-submissions'}
            >
              <Button variant='outline' type='button'>
                <ArrowLeft />
                {dict.actions.backToList}
              </Button>
            </LocalizedLink>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className='pt-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Correction Reason - Required */}
            <FormItem>
              <FormLabel className='text-base font-semibold'>
                {dict.correctPage.reasonLabel}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={dict.correctPage.reasonPlaceholder}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={3}
                  className='resize-none'
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            {/* Mark as Cancelled Switch */}
            <div className='flex items-center justify-between rounded-md border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-base font-semibold'>
                  {dict.correctPage.markAsCancelled}
                </FormLabel>
                <FormDescription>
                  {dict.correctPage.markAsCancelledHint}
                </FormDescription>
              </div>
              <Switch
                checked={markAsCancelled}
                onCheckedChange={setMarkAsCancelled}
              />
            </div>

            {!markAsCancelled && <Separator />}

            {/* Only show form fields if not marking as cancelled */}
            {!markAsCancelled && (
              <>
                {/* Supervisor Field */}
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
                                ? managersWithCurrent.find(
                                    (manager) => manager.email === field.value,
                                  )?.name
                                : dict.filters.select}
                              <ChevronsUpDown className='shrink-0 opacity-50' />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className='p-0'
                          side='bottom'
                          align='start'
                        >
                          <Command>
                            <CommandInput placeholder={dict.filters.search} />
                            <CommandList>
                              <CommandEmpty>
                                {dict.form.managerNotFound}
                              </CommandEmpty>
                              <CommandGroup className='max-h-48 overflow-y-auto'>
                                {managersWithCurrent.map((manager) => (
                                  <CommandItem
                                    value={manager.name}
                                    key={manager.email}
                                    onSelect={() => {
                                      form.setValue(
                                        'supervisor',
                                        manager.email,
                                      );
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

                {/* Work Start Time */}
                <FormField
                  control={form.control}
                  name='workStartTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.form.workStartTime}</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
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
                      <FormDescription>
                        {dict.form.workStartTimeDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Work End Time */}
                <FormField
                  control={form.control}
                  name='workEndTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.form.workEndTime}</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
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
                      <FormDescription>
                        {dict.form.workEndTimeDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hours Field (auto-calculated) */}
                <FormField
                  control={form.control}
                  name='hours'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.form.hours}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.5'
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {dict.form.hoursDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reason Field */}
                <FormField
                  control={form.control}
                  name='reason'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.form.reason}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Switch */}
                <div className='flex items-center justify-between rounded-md border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {dict.form.payment}
                    </FormLabel>
                  </div>
                  <Switch
                    checked={paymentValue}
                    onCheckedChange={(checked) =>
                      form.setValue('payment', checked)
                    }
                  />
                </div>

                {/* Scheduled Day Off */}
                {!paymentValue && (
                  <FormField
                    control={form.control}
                    name='scheduledDayOff'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{dict.form.scheduledDayOff}</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            modal
                            hideTime
                            value={field.value}
                            onChange={field.onChange}
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
                    )}
                  />
                )}
              </>
            )}

            {/* Submit Button */}
            <CardFooter className='flex justify-end gap-2 px-0'>
              {fromDetails ? (
                <LocalizedLink href={`/overtime-submissions/${submission._id}`}>
                  <Button variant='outline' type='button' disabled={isPending}>
                    {dict.actions.cancel}
                  </Button>
                </LocalizedLink>
              ) : (
                <LocalizedLink href='/overtime-submissions'>
                  <Button variant='outline' type='button' disabled={isPending}>
                    {dict.actions.cancel}
                  </Button>
                </LocalizedLink>
              )}
              <Button type='submit' disabled={isPending}>
                <Check />
                {dict.correctPage.saveCorrection}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
