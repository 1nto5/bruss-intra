'use client';

import { correctiveActionStatusOptions as statusOptions } from '@/app/[lang]/deviations/lib/options';
import { correctiveActionType } from '@/app/[lang]/deviations/lib/types';
import { createConfirmActionExecutionSchema } from '@/app/[lang]/deviations/lib/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  // TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ClipboardCheck, History, Loader } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { changeCorrectiveActionStatus } from '../actions';
import { Dictionary } from '../lib/dict';

type TableCellCorrectiveActionProps = {
  correctiveAction: correctiveActionType;
  correctiveActionIndex: number;
  deviationId: string;
  lang: string;
  user: string | null | undefined;
  userRoles: string[] | null | undefined;
  deviationOwner: string;
  dict: Dictionary;
};

const TableCellCorrectiveAction: React.FC<TableCellCorrectiveActionProps> = ({
  correctiveAction,
  correctiveActionIndex,
  deviationId,
  lang,
  user,
  userRoles,
  deviationOwner,
  dict,
}) => {
  const confirmActionExecutionSchema = createConfirmActionExecutionSchema(dict.form.validation);

  const form = useForm<z.infer<typeof confirmActionExecutionSchema>>({
    resolver: zodResolver(confirmActionExecutionSchema),
    defaultValues: {
      executedAt: new Date(new Date().setHours(12, 0, 0, 0)),
      // status: '',
      comment: '',
    },
  });

  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);

  const getStatusLabel = (statusValue: string) => {
    const status = statusOptions.find((option) => option.value === statusValue);
    return status?.label || '';
  };

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case 'open':
        return <Badge variant='statusOpen'>{dict.view.correctiveActionStatuses.open}</Badge>;
      case 'closed':
        return <Badge variant='statusApproved'>{dict.view.correctiveActionStatuses.closed}</Badge>;
      case 'overdue':
        return <Badge variant='statusOverdue'>{dict.view.correctiveActionStatuses.overdue}</Badge>;
      case 'in progress':
        return <Badge variant='statusInProgress'>{dict.view.correctiveActionStatuses.inProgress}</Badge>;
      case 'rejected':
        return <Badge variant='statusRejected'>{dict.view.correctiveActionStatuses.rejected}</Badge>;
      default:
        return (
          <Badge variant='outline' className='text-nowrap'>
            {getStatusLabel(statusValue)}
          </Badge>
        );
    }
  };

  const onSubmit = async (
    data: z.infer<typeof confirmActionExecutionSchema>,
  ) => {
    // Close dialog immediately
    setOpen(false);

    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          if (!user) {
            console.error('onSubmit', 'no user');
            reject(new Error(dict.view.correctiveActionDialogs.errors.noUser));
            return;
          }
          const status = {
            value: data.status as correctiveActionType['status']['value'],
            comment: data.comment,
            executedAt: new Date(data.executedAt),
            changed: {
              at: new Date(),
              by: user,
            },
          };
          const res = await changeCorrectiveActionStatus(
            deviationId,
            correctiveActionIndex,
            status,
          );
          if (res.success) {
            resolve();
          } else if (res.error) {
            console.error('onSubmit', res.error);
            reject(new Error(dict.view.correctiveActionDialogs.errors.contactIT));
          }
        } catch (error) {
          console.error('onSubmit', error);
          reject(new Error(dict.view.correctiveActionDialogs.errors.contactIT));
        }
      }),
      {
        loading: dict.view.correctiveActionDialogs.toasts.updating,
        success: dict.view.correctiveActionDialogs.toasts.updated,
        error: (err) => err.message || dict.view.correctiveActionDialogs.errors.contactIT,
      },
    );
  };

  return (
    <>
      <TableCell>{getStatusBadge(correctiveAction.status.value)}</TableCell>

      <TableCell>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size='icon' type='button' variant='outline'>
              <ClipboardCheck className='' />
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            {correctiveAction.status.value === 'closed' ? (
              <DialogHeader>
                <DialogTitle>{dict.view.correctiveActionDialogs.closedTitle}</DialogTitle>
                <DialogDescription>
                  {dict.view.correctiveActionDialogs.closedDescription}
                </DialogDescription>
              </DialogHeader>
            ) : correctiveAction.created.by === user ||
              user === deviationOwner ||
              user === correctiveAction.responsible ||
              userRoles?.some((role: string) =>
                [
                  'group-leader',
                  'quality-manager',
                  'production-manager',
                  'plant-manager',
                ].includes(role),
              ) ? (
              <>
                <DialogHeader>
                  <DialogTitle>{dict.view.correctiveActionDialogs.changeStatusTitle}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className='grid gap-2'>
                      <FormField
                        control={form.control}
                        name='executedAt'
                        render={({ field }) => (
                          <FormItem className='flex flex-col'>
                            <FormLabel>{dict.view.correctiveActionDialogs.changeDate}</FormLabel>
                            <FormControl>
                              <DateTimePicker
                                modal
                                hideTime
                                value={field.value}
                                onChange={field.onChange}
                                min={
                                  new Date(correctiveAction.status.executedAt)
                                }
                                max={(() => {
                                  const today = new Date();
                                  const maxDate = new Date(today);
                                  maxDate.setDate(today.getDate() + 0);
                                  return maxDate;
                                })()}
                                timePicker={{ hour: false, minute: false }}
                                renderTrigger={({ open, value, setOpen }) => (
                                  <DateTimeInput
                                    value={value}
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
                      <FormField
                        control={form.control}
                        name='status'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{dict.view.correctiveActionDialogs.status}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={dict.view.correctiveActionDialogs.selectPlaceholder} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem
                                    key={status.value}
                                    value={status.value.toString()}
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='comment'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{dict.view.correctiveActionDialogs.additionalInfo}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={dict.view.correctiveActionDialogs.additionalInfoPlaceholder}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter className='pt-4'>
                      <Button type='submit'>
                        {isPending ? <Loader className='animate-spin' /> : <Check />}{' '}
                        {dict.view.correctiveActionDialogs.confirmButton}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </>
            ) : (
              <DialogHeader>
                <DialogTitle>{dict.view.correctiveActionDialogs.noPermissionTitle}</DialogTitle>
                <DialogDescription>
                  {dict.view.correctiveActionDialogs.noPermissionDescription}
                </DialogDescription>
              </DialogHeader>
            )}
          </DialogContent>
        </Dialog>
      </TableCell>
      <TableCell>{correctiveAction.description}</TableCell>

      <TableCell className='whitespace-nowrap'>
        {extractNameFromEmail(correctiveAction.responsible)}
      </TableCell>
      <TableCell>
        {formatDate(correctiveAction.deadline)}
      </TableCell>

      <TableCell className='whitespace-nowrap'>
        {correctiveAction.status?.changed?.at
          ? formatDateTime(correctiveAction.status.changed.at)
          : '-'}
      </TableCell>

      <TableCell>
        <Dialog>
          <DialogTrigger asChild>
            <Button size='icon' type='button' variant='outline'>
              <History />
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[768px]'>
            <DialogHeader>
              <DialogTitle>{dict.view.correctiveActionDialogs.history}</DialogTitle>
            </DialogHeader>
            {/* <ScrollArea className='h-[300px]'> */}
            <div className='h-[300px] overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.view.correctiveActionDialogs.historyColumns.status}</TableHead>
                    <TableHead>{dict.view.correctiveActionDialogs.historyColumns.date}</TableHead>
                    <TableHead>{dict.view.correctiveActionDialogs.historyColumns.comment}</TableHead>
                    <TableHead>{dict.view.correctiveActionDialogs.historyColumns.person}</TableHead>
                    <TableHead>{dict.view.correctiveActionDialogs.historyColumns.time}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className='font-medium'>
                      {getStatusBadge(correctiveAction.status.value)}
                    </TableCell>
                    <TableCell>
                      {formatDate(correctiveAction.status.executedAt)}
                    </TableCell>
                    <TableCell>{correctiveAction.status.comment}</TableCell>
                    <TableCell>
                      {extractNameFromEmail(correctiveAction.created.by)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatDateTime(correctiveAction.status.changed.at)}
                    </TableCell>
                  </TableRow>
                  {correctiveAction.history &&
                    correctiveAction.history.map((historyItem, index) => (
                      <TableRow key={index}>
                        <TableCell className='font-medium'>
                          {getStatusBadge(historyItem.value)}
                        </TableCell>
                        <TableCell>
                          {formatDate(historyItem.executedAt)}
                        </TableCell>
                        <TableCell>{historyItem.comment}</TableCell>
                        <TableCell>
                          {extractNameFromEmail(historyItem.changed.by)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatDateTime(historyItem.changed.at)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {/* </ScrollArea> */}
            </div>
            {/* 
              <DialogFooter className='pt-4'>
                <Button type='submit'>Potwierdź</Button>
              </DialogFooter> */}
          </DialogContent>
        </Dialog>
      </TableCell>
    </>
  );
};

export default TableCellCorrectiveAction;
