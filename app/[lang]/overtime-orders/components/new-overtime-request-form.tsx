'use client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { EmployeeType } from '@/lib/types/employee-types';
import { UsersListType } from '@/lib/types/user';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronsUpDown,
  CircleX,
  Copy,
  Plus,
  Table,
} from 'lucide-react';
import { FreeTextCombobox } from '@/components/free-text-combobox';
import LocalizedLink from '@/components/localized-link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertOvertimeRequest as insert } from '../actions/crud';
import { redirectToOvertimeOrders as redirect } from '../actions/utils';
import { MultiSelectEmployees } from '../components/multi-select-employees';
import { createNewOvertimeRequestSchema } from '../lib/zod';
import { DepartmentConfig } from '../lib/types';
import { MultiArticleManager } from './multi-article-manager';
import { Dictionary } from '../lib/dict';
import { Locale } from '@/lib/config/i18n';
import type { Article } from '@/lib/data/get-all-articles';

export default function NewOvertimeRequestForm({
  employees,
  users,
  departments,
  loggedInUserEmail,
  dict,
  lang,
  articles,
}: {
  employees: EmployeeType[];
  users: UsersListType;
  departments: DepartmentConfig[];
  loggedInUserEmail: string;
  dict: Dictionary;
  lang: Locale;
  articles: Article[];
}) {
  const [isPendingInsert, setIsPendingInserting] = useState(false);
  const [responsibleEmployeeOpen, setResponsibleEmployeeOpen] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'save-and-add-another'>(
    'save',
  );
  const [pendingArticle, setPendingArticle] = useState<{
    articleNumber: string;
    quantity: string;
  }>({ articleNumber: '', quantity: '' });

  const today = new Date();
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  const nextSaturdayFrom = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilSaturday,
    6,
    0,
    0,
  );
  const nextSaturdayTo = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilSaturday,
    14,
    0,
    0,
  );

  const newOvertimeRequestSchema = createNewOvertimeRequestSchema(dict.validation);

  const form = useForm<z.infer<typeof newOvertimeRequestSchema>>({
    resolver: zodResolver(newOvertimeRequestSchema) as any,
    defaultValues: {
      department: 'production',
      quarry: '',
      numberOfEmployees: 1,
      numberOfShifts: 1,
      responsibleEmployee: loggedInUserEmail || '',
      employeesWithScheduledDayOff: [],
      from: nextSaturdayFrom,
      to: nextSaturdayTo,
      reason: '',
      plannedArticles: [],
    },
  });

  const onSubmit = async (
    data: z.infer<typeof newOvertimeRequestSchema>,
    currentActionType: 'save' | 'save-and-add-another' = actionType,
  ) => {
    // Check if there's a pending article that hasn't been added
    if (pendingArticle.articleNumber && pendingArticle.quantity) {
      form.setError('plannedArticles', {
        type: 'manual',
        message: dict.validation.pendingArticleNotAdded,
      });
      return;
    }

    setIsPendingInserting(true);
    try {
      const res = await insert(data);
      if ('success' in res) {
        if (currentActionType === 'save-and-add-another') {
          toast.success(dict.newOvertimeRequestForm.toast.saved);
          // Do NOT reset the form here
        } else {
          toast.success(dict.newOvertimeRequestForm.toast.added);
          form.reset();
          redirect(lang);
        }
      } else if ('error' in res) {
        console.error(res.error);
        toast.error(dict.newOvertimeRequestForm.toast.contactIT);
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.newOvertimeRequestForm.toast.contactIT);
    } finally {
      setIsPendingInserting(false);
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
          <CardTitle>{dict.newOvertimeRequestForm.title}</CardTitle>
          <LocalizedLink href='/overtime-orders'>
            <Button variant='outline'>
              <Table /> <span>{dict.newOvertimeRequestForm.requestsTable}</span>
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
              name='department'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.department.label}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'production') {
                          form.setValue('quarry', '');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dict.department.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {departments
                          .sort((a, b) => {
                            const aName = lang === 'pl' ? a.namePl : lang === 'de' ? a.nameDe : a.name;
                            const bName = lang === 'pl' ? b.namePl : lang === 'de' ? b.nameDe : b.name;
                            return aName.localeCompare(bName, lang);
                          })
                          .map((dept) => {
                            const displayName = lang === 'pl' ? dept.namePl : lang === 'de' ? dept.nameDe : dept.name;
                            return (
                              <SelectItem key={dept.value} value={dept.value}>
                                {displayName}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('department') === 'production' && (
              <FormField
                control={form.control}
                name='quarry'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.quarry.label}</FormLabel>
                    <FormControl>
                      <FreeTextCombobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        options={['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']}
                        placeholder={dict.quarry.placeholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='from'
              render={({ field }) => {
                const handleFromChange = (date: Date | undefined) => {
                  field.onChange(date);
                  const currentEndDate = form.getValues('to');
                  if (date && currentEndDate && date > currentEndDate) {
                    const newEndDate = new Date(date);
                    newEndDate.setHours(currentEndDate.getHours());
                    newEndDate.setMinutes(currentEndDate.getMinutes());
                    newEndDate.setSeconds(currentEndDate.getSeconds());
                    form.setValue('to', newEndDate);
                  }
                };

                return (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.startWork}</FormLabel>
                  <FormDescription>
                    {dict.newOvertimeRequestForm.startWorkDescription}
                  </FormDescription>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={handleFromChange}
                      min={new Date(Date.now() + 8 * 3600 * 1000)}
                      timePicker={{ hour: true, minute: true, second: false }}
                      renderTrigger={({ value, setOpen, open }) => (
                        <DateTimeInput
                          value={value}
                          onChange={handleFromChange}
                          format='dd/MM/yyyy HH:mm'
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
              name='to'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.endWork}</FormLabel>
                  <FormDescription>
                    {dict.newOvertimeRequestForm.endWorkDescription}
                  </FormDescription>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      min={new Date(Date.now() + 8 * 3600 * 1000)}
                      timePicker={{ hour: true, minute: true, second: false }}
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
              name='numberOfShifts'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.numberOfShifts}</FormLabel>
                  <FormDescription>
                    {dict.newOvertimeRequestForm.numberOfShiftsDescription}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === '' ? '' : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='responsibleEmployee'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.responsible}</FormLabel>
                  <FormDescription>
                    {dict.newOvertimeRequestForm.responsibleDescription}
                  </FormDescription>
                  <Popover
                    open={responsibleEmployeeOpen}
                    onOpenChange={setResponsibleEmployeeOpen}
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
                            ? users.find((user) => user.email === field.value)
                                ?.name
                            : dict.newOvertimeRequestForm.selectResponsible}
                          <ChevronsUpDown className='shrink-0 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='p-0' side='bottom' align='start'>
                      <Command>
                        <CommandInput placeholder={dict.newOvertimeRequestForm.searchPerson} />
                        <CommandList>
                          <CommandEmpty>{dict.newOvertimeRequestForm.personNotFound}</CommandEmpty>
                          <CommandGroup className='max-h-48 overflow-y-auto'>
                            {users.map((user) => (
                              <CommandItem
                                value={user.name}
                                key={user.email}
                                onSelect={() => {
                                  form.setValue(
                                    'responsibleEmployee',
                                    user.email,
                                  );
                                  setResponsibleEmployeeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    user.email === field.value
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='numberOfEmployees'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.numberOfEmployees}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      onChange={(e) => {
                        const value =
                          e.target.value === '' ? '' : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='employeesWithScheduledDayOff'
              render={({ field }) => (
                <FormItem>
                  <div className='flex flex-col items-start space-y-2'>
                    <FormLabel>{dict.newOvertimeRequestForm.scheduledDayOff}</FormLabel>
                    <FormControl>
                      <MultiSelectEmployees
                        employees={employees}
                        value={field.value}
                        dict={dict}
                        onSelectChange={(selectedEmployees) => {
                          const employeesWithDays = selectedEmployees.map(
                            (emp) => ({
                              ...emp,
                              agreedReceivingAt: new Date(
                                Date.now() + 7 * 24 * 60 * 60 * 1000,
                              ),
                            }),
                          );
                          field.onChange(employeesWithDays);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {dict.newOvertimeRequestForm.reason}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='note'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.newOvertimeRequestForm.note}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='plannedArticles'
              render={({ field }) => (
                <FormItem>
                  <MultiArticleManager
                    value={field.value || []}
                    onChange={field.onChange}
                    dict={dict}
                    onPendingChange={setPendingArticle}
                    onClearError={() => form.clearErrors('plannedArticles')}
                    articles={articles}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion type='single' collapsible>
              <AccordionItem value='item-1'>
                <AccordionTrigger>
                  {dict.newOvertimeRequestForm.accordion.restPeriod}
                </AccordionTrigger>
                <AccordionContent className='text-justify'>
                  {dict.newOvertimeRequestForm.accordion.restPeriodContent}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='item-2'>
                <AccordionTrigger>{dict.newOvertimeRequestForm.accordion.brussStandard}</AccordionTrigger>
                <AccordionContent className='text-justify'>
                  {dict.newOvertimeRequestForm.accordion.brussStandardContent}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='item-3'>
                <AccordionTrigger>
                  {dict.newOvertimeRequestForm.accordion.legalInfo}
                </AccordionTrigger>
                <AccordionContent className='text-justify'>
                  <p>
                    {dict.newOvertimeRequestForm.accordion.legalInfoContent1}
                  </p>
                  <p>
                    {dict.newOvertimeRequestForm.accordion.legalInfoContent2}
                  </p>
                  <p>
                    {dict.newOvertimeRequestForm.accordion.legalInfoContent3}
                  </p>
                  <p>
                    {dict.newOvertimeRequestForm.accordion.legalInfoContent4}
                  </p>
                  <p>
                    {dict.newOvertimeRequestForm.accordion.legalInfoContent5}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>

          <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button
              variant='destructive'
              type='button'
              onClick={() => form.reset()}
              className='w-full sm:w-auto'
              disabled={isPendingInsert}
            >
              <CircleX />
              {dict.common.clear}
            </Button>
            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
              <Button
                type='button'
                variant='secondary'
                onClick={handleSaveAndAddAnother}
                disabled={isPendingInsert}
                className='w-full sm:w-auto'
              >
                <Copy
                  className={
                    isPendingInsert && actionType === 'save-and-add-another'
                      ? 'animate-spin'
                      : ''
                  }
                />
                {dict.newOvertimeRequestForm.saveAndAddAnother}
              </Button>
              <Button
                type='button'
                onClick={handleRegularSave}
                className='w-full sm:w-auto'
                disabled={isPendingInsert}
              >
                <Plus
                  className={
                    isPendingInsert && actionType === 'save'
                      ? 'animate-spin'
                      : ''
                  }
                />
                {dict.newOvertimeRequestForm.addOrder}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
