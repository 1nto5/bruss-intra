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
import { FormSection } from '@/components/ui/form-section';
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
  Save,
  Table,
} from 'lucide-react';
import { useState } from 'react';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { updateOvertimeRequest as update } from '../actions/crud';
import { redirectToOvertimeOrders as redirect } from '../actions/utils';
import { MultiSelectEmployees } from '../components/multi-select-employees';
import { MultiArticleManager } from './multi-article-manager';
import { Dictionary } from '../lib/dict';
import { createNewOvertimeRequestSchema } from '../lib/zod';
import { DepartmentConfig, OvertimeType } from '../lib/types';
import { Locale } from '@/lib/config/i18n';
import type { Article } from '@/lib/data/get-all-articles';

export default function EditOvertimeRequestForm({
  employees,
  users,
  departments,
  overtimeRequest,
  dict,
  lang,
  articles,
}: {
  employees: EmployeeType[];
  users: UsersListType;
  departments: DepartmentConfig[];
  overtimeRequest: OvertimeType;
  dict: Dictionary;
  lang: Locale;
  articles: Article[];
}) {
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);
  const [responsibleEmployeeOpen, setResponsibleEmployeeOpen] = useState(false);
  const [pendingArticle, setPendingArticle] = useState<{
    articleNumber: string;
    quantity: string;
  }>({ articleNumber: '', quantity: '' });

  const newOvertimeRequestSchema = createNewOvertimeRequestSchema(dict.validation);

  const form = useForm<z.infer<typeof newOvertimeRequestSchema>>({
    resolver: zodResolver(newOvertimeRequestSchema) as any,
    defaultValues: {
      department: overtimeRequest.department || '',
      numberOfEmployees: overtimeRequest.numberOfEmployees,
      numberOfShifts: overtimeRequest.numberOfShifts,
      responsibleEmployee: overtimeRequest.responsibleEmployee,
      employeesWithScheduledDayOff: overtimeRequest.employeesWithScheduledDayOff || [],
      from: new Date(overtimeRequest.from),
      to: new Date(overtimeRequest.to),
      reason: overtimeRequest.reason,
      note: overtimeRequest.note || '',
      plannedArticles: overtimeRequest.plannedArticles || [],
    },
  });

  const onSubmit = async (data: z.infer<typeof newOvertimeRequestSchema>) => {
    // Check if there's a pending article that hasn't been added
    if (pendingArticle.articleNumber && pendingArticle.quantity) {
      form.setError('plannedArticles', {
        type: 'manual',
        message: dict.validation.pendingArticleNotAdded,
      });
      return;
    }

    setIsPendingUpdate(true);
    try {
      const res = await update(overtimeRequest._id, data);
      if ('success' in res) {
        toast.success(dict.editOvertimeRequestForm.toast.updated);
        redirect(lang);
      } else if ('error' in res) {
        console.error(res.error);
        if (res.error === 'unauthorized') {
          toast.error(dict.editOvertimeRequestForm.toast.unauthorized);
        } else if (res.error === 'cannot edit - invalid status') {
          toast.error(dict.editOvertimeRequestForm.toast.invalidStatus);
        } else {
          toast.error(dict.editOvertimeRequestForm.toast.contactIT);
        }
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.editOvertimeRequestForm.toast.contactIT);
    } finally{
      setIsPendingUpdate(false);
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>
            {dict.editOvertimeRequestForm.title}
          </CardTitle>
          <LocalizedLink href='/overtime-orders'>
            <Button variant='outline'>
              <Table /> <span>{dict.editOvertimeRequestForm.requestsTable}</span>
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
              name='department'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.department.label}</FormLabel>
                  <FormDescription>
                    {dict.department.description}
                  </FormDescription>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
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
            <FormField
              control={form.control}
              name='from'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.editOvertimeRequestForm.startWork}</FormLabel>
                  <FormDescription>
                    {dict.editOvertimeRequestForm.startWorkDescription}
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
              name='to'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.editOvertimeRequestForm.endWork}</FormLabel>
                  <FormDescription>
                    {dict.editOvertimeRequestForm.endWorkDescription}
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
                  <FormLabel>{dict.editOvertimeRequestForm.numberOfShifts}</FormLabel>
                  <FormDescription>
                    {dict.editOvertimeRequestForm.numberOfShiftsDescription}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
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
                  <FormLabel>{dict.editOvertimeRequestForm.responsible}</FormLabel>
                  <FormDescription>
                    {dict.editOvertimeRequestForm.responsibleDescription}
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
                            : dict.editOvertimeRequestForm.selectResponsible}
                          <ChevronsUpDown className='shrink-0 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='p-0' side='bottom' align='start'>
                      <Command>
                        <CommandInput placeholder={dict.editOvertimeRequestForm.searchPerson} />
                        <CommandList>
                          <CommandEmpty>{dict.editOvertimeRequestForm.personNotFound}</CommandEmpty>
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
                  <FormLabel>{dict.editOvertimeRequestForm.numberOfEmployees}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
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
                    <FormLabel>{dict.editOvertimeRequestForm.scheduledDayOff}</FormLabel>
                    <FormControl>
                      <MultiSelectEmployees
                        employees={employees}
                        value={field.value}
                        dict={dict}
                        onSelectChange={(selectedEmployees) => {
                          const employeesWithDays = selectedEmployees.map(
                            (emp) => ({
                              ...emp,
                              agreedReceivingAt: emp.agreedReceivingAt || new Date(
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
                    {dict.editOvertimeRequestForm.reason}
                  </FormLabel>
                  <FormControl>
                    <Textarea className='' {...field} />
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
                  <FormLabel>{dict.editOvertimeRequestForm.note}</FormLabel>
                  <FormControl>
                    <Textarea className='' {...field} />
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
                  {dict.editOvertimeRequestForm.accordion.restPeriod}
                </AccordionTrigger>
                <AccordionContent className='text-justify'>
                  {dict.editOvertimeRequestForm.accordion.restPeriodContent}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='item-2'>
                <AccordionTrigger>{dict.editOvertimeRequestForm.accordion.brussStandard}</AccordionTrigger>
                <AccordionContent className='text-justify'>
                  {dict.editOvertimeRequestForm.accordion.brussStandardContent}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='item-3'>
                <AccordionTrigger>
                  {dict.editOvertimeRequestForm.accordion.legalInfo}
                </AccordionTrigger>
                <AccordionContent className='text-justify'>
                  <p>
                    {dict.editOvertimeRequestForm.accordion.legalInfoContent1}
                  </p>
                  <p>
                    {dict.editOvertimeRequestForm.accordion.legalInfoContent2}
                  </p>
                  <p>
                    {dict.editOvertimeRequestForm.accordion.legalInfoContent3}
                  </p>
                  <p>
                    {dict.editOvertimeRequestForm.accordion.legalInfoContent4}
                  </p>
                  <p>
                    {dict.editOvertimeRequestForm.accordion.legalInfoContent5}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>

          <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
            <LocalizedLink href='/overtime-orders'>
              <Button
                variant='destructive'
                type='button'
                className='w-full sm:w-auto'
                disabled={isPendingUpdate}
              >
                <CircleX className='' />
                {dict.editOvertimeRequestForm.discardChanges}
              </Button>
            </LocalizedLink>
            <Button
              type='submit'
              className='w-full sm:w-auto'
              disabled={isPendingUpdate}
            >
              <Save
                className={isPendingUpdate ? 'animate-spin' : ''}
              />
              {dict.editOvertimeRequestForm.saveChanges}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}