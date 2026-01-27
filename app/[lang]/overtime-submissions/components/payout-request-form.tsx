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
import { ArrowLeft, Check, ChevronsUpDown, CircleX, Loader, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertPayoutRequest } from '../actions/crud';
import { redirectToOvertime } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { createPayoutRequestSchema } from '../lib/zod';

interface PayoutRequestFormProps {
  managers: UsersListType;
  balance: number;
  dict: Dictionary;
  lang: Locale;
}

export default function PayoutRequestForm({
  managers,
  balance,
  dict,
  lang,
}: PayoutRequestFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);

  const payoutRequestSchema = createPayoutRequestSchema({
    supervisorEmailInvalid: dict.validation.supervisorEmailInvalid,
    supervisorRequired: dict.validation.supervisorRequired,
    hoursMinRange: dict.payoutRequest?.hoursMinRange || 'Must be positive',
    hoursIncrementInvalid: dict.validation.hoursIncrementInvalid,
    reasonRequired: dict.validation.reasonRequired,
  });

  const form = useForm<z.infer<typeof payoutRequestSchema>>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues: {
      supervisor: '',
      hours: balance > 0 ? Math.min(balance, 8) : 1,
      reason: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof payoutRequestSchema>) => {
    setIsPending(true);
    try {
      // Client-side validation for balance
      if (data.hours > balance) {
        toast.error(dict.payoutRequest?.exceedsBalance || 'Exceeds balance');
        setIsPending(false);
        return;
      }

      const res = await insertPayoutRequest(data);

      if ('success' in res) {
        toast.success(dict.payoutRequest?.success || 'Payout request submitted');
        form.reset();
        redirectToOvertime(lang);
      } else if ('error' in res) {
        if (res.error === 'exceeds_balance') {
          toast.error(dict.payoutRequest?.exceedsBalance || 'Exceeds balance');
        } else if (res.error === 'no_balance') {
          toast.error(dict.payoutRequest?.noBalance || 'No balance available');
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

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.payoutRequest?.title || 'Payout Request'}</CardTitle>
          <LocalizedLink href='/overtime-submissions'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.backToSubmissions}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>

      <Separator className='mb-4' />

      {/* Balance display */}
      <CardContent className='pb-4'>
        <div className='rounded-lg bg-muted p-4'>
          <p className='text-sm text-muted-foreground'>
            {dict.payoutRequest?.currentBalance || 'Your current balance'}
          </p>
          <p className='text-2xl font-bold'>
            {balance}h
          </p>
        </div>
      </CardContent>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
              name='hours'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.payoutRequest?.hours || 'Hours'}</FormLabel>
                  <FormDescription>
                    {dict.payoutRequest?.hoursDescription ||
                      `Max: ${balance}h (your current balance)`}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      step={0.5}
                      min={0.5}
                      max={balance}
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
            <Button
              variant='destructive'
              type='button'
              onClick={() => form.reset()}
              className='w-full sm:w-auto'
            >
              <CircleX />
              {dict.filters.clear}
            </Button>

            <Button
              type='submit'
              className='w-full sm:w-auto'
              disabled={isPending || balance <= 0}
            >
              {isPending ? <Loader className='animate-spin' /> : <Send />}
              {dict.payoutRequest?.submit || 'Submit Request'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
