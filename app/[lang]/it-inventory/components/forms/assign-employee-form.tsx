'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { DateTimeInput } from '@/components/ui/datetime-input';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, ArrowLeft, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { assignEmployee } from '../../actions/assignment';
import { redirectToInventoryItem as redirect } from '../../actions/utils';
import { createAssignEmployeeSchema } from '../../lib/zod';
import { Dictionary } from '../../lib/dict';
import { Locale } from '@/lib/config/i18n';
import { ITInventoryItem } from '../../lib/types';
import { EmployeeType } from '@/lib/types/employee-types';
import * as z from 'zod';

export default function AssignEmployeeForm({
  item,
  employees,
  dict,
  lang,
}: {
  item: ITInventoryItem;
  employees: EmployeeType[];
  dict: Dictionary;
  lang: Locale;
}) {
  const [isPending, setIsPending] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const schema = createAssignEmployeeSchema(dict.validation);
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assignmentType: 'employee' as const,
      employeeIdentifier: '',
      customName: '',
      assignedAt: new Date(),
      reason: '',
    },
  });

  const watchAssignmentType = form.watch('assignmentType');

  // Check if item has 'in-stock' status
  const hasInStockStatus = item.statuses.includes('in-stock');

  async function performAssignment(data: FormData) {
    setIsPending(true);

    try {
      const result = await assignEmployee(item._id, data);

      if ('error' in result) {
        toast.error(dict.toast.contactIT);
        setIsPending(false);
        return;
      }

      toast.success(dict.toast.assigned);
      redirect(item._id, lang);
    } catch (error) {
      console.error(error);
      toast.error(dict.toast.error);
      setIsPending(false);
    }
  }

  async function onSubmit(data: FormData) {
    // If item has 'in-stock' status, show confirmation dialog
    if (hasInStockStatus) {
      setPendingData(data);
      setShowConfirmDialog(true);
      return;
    }

    // Otherwise, proceed directly
    await performAssignment(data);
  }

  function handleConfirmAssignment() {
    if (pendingData) {
      setShowConfirmDialog(false);
      performAssignment(pendingData);
    }
  }

  function handleCancelAssignment() {
    setShowConfirmDialog(false);
    setPendingData(null);
  }

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <div>
            <CardTitle>{dict.form.assign.title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {dict.table.columns.assetId}: <strong>{item.assetId}</strong>
            </div>
          </div>
          <LocalizedLink href='/it-inventory'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.common.back}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Assignment Type Radio */}
            <FormField
              control={form.control}
              name="assignmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.assign.assignmentType}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="employee" id="employee" />
                        <Label htmlFor="employee" className="font-normal cursor-pointer">
                          {dict.form.assign.assignToEmployee}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="font-normal cursor-pointer">
                          {dict.form.assign.assignToCustom}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Employee Selector - Conditional */}
            {watchAssignmentType === 'employee' && (
              <FormField
                control={form.control}
                name="employeeIdentifier"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{dict.form.assign.employee}</FormLabel>
                  <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value
                            ? (() => {
                                const emp = employees.find(
                                  (e) => e.identifier === field.value,
                                );
                                return emp
                                  ? `${emp.firstName} ${emp.lastName} (${emp.identifier})`
                                  : field.value;
                              })()
                            : dict.common.select}
                          <ChevronsUpDown className="shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder={dict.form.assign.searchPlaceholder}
                        />
                        <CommandList>
                          <CommandEmpty>{dict.table.noResults}</CommandEmpty>
                          <CommandGroup>
                            {employees.map((emp) => (
                              <CommandItem
                                key={emp.identifier}
                                value={`${emp.firstName} ${emp.lastName} ${emp.identifier}`}
                                onSelect={() => {
                                  form.setValue('employeeIdentifier', emp.identifier);
                                  setEmployeeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    emp.identifier === field.value
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
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Custom Name Input - Conditional */}
            {watchAssignmentType === 'custom' && (
              <FormField
                control={form.control}
                name="customName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.assign.customName}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={dict.form.assign.customNamePlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assignment Date */}
            <FormField
              control={form.control}
              name="assignedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{dict.form.assign.assignedAt}</FormLabel>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    hideTime
                    renderTrigger={({ value, setOpen, open }) => (
                      <DateTimeInput
                        value={value}
                        onChange={(x) => !open && field.onChange(x)}
                        format="dd/MM/yyyy"
                        disabled={open}
                        onCalendarClick={() => setOpen(!open)}
                        className="w-full"
                      />
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason / Note */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.assign.reason}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={isPending} className='w-full sm:w-auto'>
              <UserPlus />
              {dict.common.assign}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.form.assign.statusChangeConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.form.assign.statusChangeConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAssignment}>
              {dict.form.assign.statusChangeCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAssignment}>
              {dict.form.assign.statusChangeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
