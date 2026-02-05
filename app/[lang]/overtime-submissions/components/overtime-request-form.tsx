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
import { Textarea } from '@/components/ui/textarea';
import { Locale } from '@/lib/config/i18n';
import { UsersListType } from '@/lib/types/user';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronsUpDown,
  CircleX,
  Copy,
  Loader,
  Plus,
  Save,
  Table,
} from 'lucide-react';
import { useState } from 'react';
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
import { createOvertimeSubmissionSchema } from '../lib/zod';

interface OvertimeRequestFormProps {
  managers: UsersListType;
  loggedInUserEmail: string;
  mode: 'new' | 'edit';
  submission?: OvertimeSubmissionType;
  dict: Dictionary;
  lang: Locale;
  requiresReapproval?: boolean;
}

export default function OvertimeRequestForm({
  managers,
  loggedInUserEmail,
  mode,
  submission,
  dict,
  lang,
  requiresReapproval = false,
}: OvertimeRequestFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'save-and-add-another'>(
    'save',
  );

  const isEditMode = mode === 'edit';

  const overtimeSubmissionSchema = createOvertimeSubmissionSchema(
    dict.validation,
  );

  const form = useForm<z.infer<typeof overtimeSubmissionSchema>>({
    resolver: zodResolver(overtimeSubmissionSchema) as any,
    defaultValues: {
      supervisor: isEditMode ? submission!.supervisor : '',
      date: isEditMode && submission!.date ? new Date(submission!.date) : undefined,
      hours: isEditMode ? submission!.hours : 1,
      reason: isEditMode ? submission!.reason : '',
    },
  });

  const onSubmit = async (
    data: z.infer<typeof overtimeSubmissionSchema>,
    currentActionType: 'save' | 'save-and-add-another' = actionType,
  ) => {
    setIsPending(true);
    try {
      const submissionData: any = { ...data };

      // Ensure date is always set
      if (!submissionData.date) {
        submissionData.date = new Date();
      }

      const finalData = submissionData as OvertimeSubmissionType;

      let res;
      if (isEditMode) {
        // Use edit if this requires re-approval (HR/Admin editing non-pending)
        if (requiresReapproval) {
          res = await edit(submission!._id, finalData);
        } else {
          res = await update(submission!._id, finalData);
        }
      } else {
        res = await insert(finalData);
      }

      if ('success' in res) {
        const successMessage = isEditMode
          ? dict.toast.submissionUpdated
          : dict.toast.submissionAdded;

        if (!isEditMode) {
          if (currentActionType === 'save-and-add-another') {
            toast.success(dict.toast.submissionSaved);
            // Keep all form data except reason
            const currentValues = form.getValues();
            form.reset({
              ...currentValues,
              reason: '',
            });
          } else {
            toast.success(successMessage);
            form.reset();
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
    return isEditMode ? dict.form.titleEdit : dict.form.titleNew;
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
              <Table /> <span>{dict.form.submissionsTable}</span>
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
              name='date'
              render={({ field }) => {
                const now = new Date();
                now.setHours(23, 59, 59, 999);

                // Calculate 7 days ago
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setHours(0, 0, 0, 0);
                sevenDaysAgo.setDate(now.getDate() - 7);

                const minDate = sevenDaysAgo;

                return (
                  <FormItem>
                    <FormLabel>{dict.form.date}</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        modal
                        hideTime
                        value={field.value}
                        onChange={field.onChange}
                        min={minDate}
                        max={now}
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
                {isPending && actionType === 'save' ? (
                  <Loader className='animate-spin' />
                ) : (
                  <SubmitIcon />
                )}
                {getSubmitButtonText()}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
