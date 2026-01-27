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
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { correctOvertimeSubmission } from '../actions/crud';
import { Dictionary } from '../lib/dict';
import { OvertimeSubmissionType } from '../lib/types';
import { createOvertimeCorrectionSchema } from '../lib/zod';

interface CorrectOvertimeFormProps {
  managers: UsersListType;
  loggedInUserEmail: string;
  submission: OvertimeSubmissionType;
  dict: Dictionary;
  lang: Locale;
  fromDetails?: boolean;
  returnUrl?: string;
}

export default function CorrectOvertimeForm({
  managers,
  loggedInUserEmail,
  submission,
  dict,
  lang,
  fromDetails = false,
  returnUrl,
}: CorrectOvertimeFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [markAsCancelled, setMarkAsCancelled] = useState(
    submission.status === 'cancelled',
  );
  const router = useRouter();

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

  const overtimeCorrectionSchema = createOvertimeCorrectionSchema(dict.validation);

  // Track original cancelled state
  const wasOriginalCancelled = submission.status === 'cancelled';

  const form = useForm<z.infer<typeof overtimeCorrectionSchema>>({
    resolver: zodResolver(overtimeCorrectionSchema),
    defaultValues: {
      supervisor: submission.supervisor,
      date: submission.date ? new Date(submission.date) : undefined,
      hours: submission.hours,
      reason: submission.reason || '',
      correctionReason: '',
    },
  });

  // Watch form values to detect changes
  const watchedValues = form.watch();

  // Check if there are actual changes
  const hasChanges = useMemo(() => {
    // Status change (cancelling or un-cancelling)
    const statusChanged = markAsCancelled !== wasOriginalCancelled;
    if (statusChanged) return true;

    // If marking as cancelled, only status change matters (fields are hidden)
    if (markAsCancelled) return false;

    // Field changes
    const supervisorChanged = watchedValues.supervisor !== submission.supervisor;
    const hoursChanged = watchedValues.hours !== submission.hours;
    const reasonChanged = (watchedValues.reason || '') !== (submission.reason || '');
    const dateChanged =
      watchedValues.date &&
      submission.date &&
      new Date(watchedValues.date).getTime() !== new Date(submission.date).getTime();

    return supervisorChanged || hoursChanged || reasonChanged || dateChanged;
  }, [watchedValues, markAsCancelled, wasOriginalCancelled, submission]);

  const onSubmit = async (values: z.infer<typeof overtimeCorrectionSchema>) => {
    if (!hasChanges) {
      toast.error(dict.correctPage.noChanges);
      return;
    }
    setIsPending(true);

    const dataToSubmit = {
      ...submission,
      ...values,
      _id: submission._id,
    };

    const result = await correctOvertimeSubmission(
      submission._id,
      dataToSubmit,
      values.correctionReason,
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
      if (returnUrl) {
        router.push(`/${lang}${decodeURIComponent(returnUrl)}`);
      } else {
        router.push(`/${lang}/overtime-submissions/${submission._id}`);
      }
    }
  };

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
            <FormField
              control={form.control}
              name='correctionReason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-base font-semibold'>
                    {dict.correctPage.reasonLabel}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.correctPage.reasonPlaceholder}
                      {...field}
                      rows={3}
                      className='resize-none'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <PopoverContent className='p-0' side='bottom' align='start'>
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

                {/* Date Field */}
                <FormField
                  control={form.control}
                  name='date'
                  render={({ field }) => {
                    const now = new Date();
                    now.setHours(23, 59, 59, 999);

                    // Calculate 7 days ago
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setHours(0, 0, 0, 0);
                    sevenDaysAgo.setDate(now.getDate() - 7);

                    // Calculate month boundary protection
                    const startOfCurrentMonth = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1,
                    );
                    startOfCurrentMonth.setHours(0, 0, 0, 0);

                    const threeDaysBeforeMonth = new Date(startOfCurrentMonth);
                    threeDaysBeforeMonth.setDate(
                      startOfCurrentMonth.getDate() - 3,
                    );

                    // Use the later date as minimum
                    const minDate =
                      sevenDaysAgo > threeDaysBeforeMonth
                        ? sevenDaysAgo
                        : threeDaysBeforeMonth;
                    const maxDate = undefined;

                    return (
                      <FormItem>
                        <FormLabel>{dict.form.date}</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            modal
                            hideTime
                            value={field.value || new Date()}
                            onChange={field.onChange}
                            min={minDate}
                            max={maxDate}
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

                {/* Hours Field */}
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
              <Button type='submit' disabled={isPending || !hasChanges}>
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

