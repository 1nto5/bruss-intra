'use client';

import {
  DeviationAreaType,
  DeviationReasonType,
  DeviationType,
} from '@/app/[lang]/deviations/lib/types';
import { createAddDeviationSchema } from '@/app/[lang]/deviations/lib/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Locale } from '@/lib/config/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftFromLine, Loader, Plus, Search } from 'lucide-react';
import { useState, useTransition } from 'react';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  findArticleName,
  redirectToDeviation,
  updateDeviation,
} from '../actions';
import { Dictionary } from '../lib/dict';

export default function EditForm({
  reasonOptions,
  areaOptions,
  deviation,
  id,
  lang,
  dict,
}: {
  reasonOptions: DeviationReasonType[];
  areaOptions: DeviationAreaType[];
  deviation: DeviationType;
  id: string;
  lang: Locale;
  dict: Dictionary;
}) {
  const [isPendingUpdate, setIsPendingUpdate] = useState(false); // Renamed state for clarity
  const [isPendingFindArticleName, startFindArticleNameTransition] =
    useTransition();

  const addDeviationSchema = createAddDeviationSchema(dict.form.validation);

  const form = useForm<z.infer<typeof addDeviationSchema>>({
    resolver: zodResolver(addDeviationSchema),
    defaultValues: {
      articleNumber: deviation?.articleNumber || undefined,
      articleName: deviation?.articleName || undefined,
      workplace: deviation?.workplace || undefined,
      area: deviation?.area || undefined,
      quantity: deviation?.quantity?.value?.toString() || undefined,
      unit: deviation?.quantity?.unit || undefined,
      charge: deviation?.charge || undefined,
      description: deviation?.description || undefined,
      reason: deviation?.reason || undefined,
      periodFrom: deviation?.timePeriod?.from
        ? new Date(deviation.timePeriod.from)
        : undefined, // Changed default to undefined
      periodTo: deviation?.timePeriod?.to
        ? new Date(deviation.timePeriod.to)
        : undefined, // Changed default to undefined
      processSpecification: deviation?.processSpecification || undefined,
      customerNumber: deviation?.customerNumber || undefined,
      customerName: deviation?.customerName || undefined,
      customerAuthorization: deviation?.customerAuthorization || false,
    },
  });

  const handleFindArticleName = async () => {
    startFindArticleNameTransition(async () => {
      try {
        const articleNumber = form.getValues('articleNumber');
        if (!articleNumber) {
          toast.error(dict.form.enterArticleNumber);
          return;
        }
        if (articleNumber.length === 5) {
          const res = await findArticleName(articleNumber);
          if (res.success) {
            form.setValue('articleName', res.success);
          } else if (res.error === 'not found') {
            toast.error(dict.form.articleNotFound);
          } else if (res.error) {
            console.error(res.error);
            toast.error(dict.form.contactIT);
          }
        } else {
          toast.error(dict.form.enterValidArticleNumber);
        }
      } catch (error) {
        console.error('handleFindArticleName', error);
        toast.error(dict.form.contactIT);
      }
    });
  };

  const onSubmit = async (data: z.infer<typeof addDeviationSchema>) => {
    setIsPendingUpdate(true); // Use the renamed state setter
    try {
      // 1. Update the deviation using the validated data and the deviation ID
      const updateRes = await updateDeviation(id, data); // Call updateDeviation with id and data

      if (updateRes.success) {
        toast.success(dict.form.deviationUpdated); // Updated success message
        redirectToDeviation(id, lang);
      } else if (updateRes.error === 'not authorized') {
        toast.error(dict.form.notAuthorizedToEdit);
      } else if (updateRes.error === 'not found') {
        toast.error(dict.form.deviationNotFound);
      } else if (updateRes.error === 'no changes') {
        toast.warning(dict.form.noChanges);
      } else if (updateRes.error) {
        console.error('onSubmit - updateDeviation error:', updateRes.error);
        toast.error(dict.form.contactIT);
      }
    } catch (error) {
      console.error('onSubmit error:', error);
      toast.error(dict.form.contactIT);
    } finally {
      setIsPendingUpdate(false); // Use the renamed state setter
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          {/* <div> */}
          <CardTitle>{dict.form.editTitle}</CardTitle>
          {/* <CardDescription>ID: {deviation?._id}</CardDescription> */}
          {/* </div> */}
          <LocalizedLink href={`/deviations/${id}`}>
            <Button variant='outline'>
              <ArrowLeftFromLine /> <span>{dict.form.deviationLink}</span>
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
              name='articleNumber'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>{dict.form.articleNumber}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='articleName'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>{dict.form.articleName}</FormLabel>
                  <div className='flex items-center space-x-2'>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <Button
                      variant='outline'
                      type='button'
                      onClick={handleFindArticleName}
                      disabled={isPendingFindArticleName}
                    >
                      <Search
                        className={
                          isPendingFindArticleName ? 'animate-spin' : ''
                        }
                      />{' '}
                      <span>{dict.form.findName}</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'>
              <FormField
                control={form.control}
                name='customerNumber'
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{dict.form.customerPartNumber}</FormLabel>
                    <FormControl>
                      <Input placeholder='' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='customerName'
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{dict.form.customerName}</FormLabel>
                    <FormControl>
                      <Input placeholder='' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='workplace'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>{dict.form.workstation}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='area'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>{dict.form.area}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col space-y-1'
                    >
                      {areaOptions.map((area) => (
                        <FormItem
                          key={area.value}
                          className='flex items-center space-y-0 space-x-3'
                        >
                          <FormControl>
                            <RadioGroupItem value={area.value} />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {lang === 'pl' ? area.pl : area.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4'>
              <FormField
                control={form.control}
                name='quantity'
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{dict.form.quantity}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='unit'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.unit}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-row sm:flex-col'
                      >
                        <FormItem
                          key={'pc'}
                          className='flex items-center space-y-0 space-x-3'
                        >
                          <FormControl>
                            <RadioGroupItem value='pcs' />
                          </FormControl>
                          <FormLabel className='font-normal'>{dict.form.pcs}</FormLabel>
                        </FormItem>
                        <FormItem
                          key={'kg'}
                          className='ml-4 flex items-center space-y-0 space-x-3 sm:ml-0'
                        >
                          <FormControl>
                            <RadioGroupItem value='kg' />
                          </FormControl>
                          <FormLabel className='font-normal'>{dict.form.kg}</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='charge'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.batch}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.form.descriptionPlaceholder}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormLabel>{dict.form.reason}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col space-y-1'
                    >
                      {reasonOptions.map((reason) => (
                        <FormItem
                          key={reason.value.toString()}
                          className='flex items-center space-y-0 space-x-3'
                        >
                          <FormControl>
                            <RadioGroupItem value={reason.value} />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {lang === 'pl' ? reason.pl : reason.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'>
              <FormField
                control={form.control}
                name='periodFrom'
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{dict.form.periodFrom}</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        modal
                        hideTime
                        value={field.value}
                        onChange={field.onChange}
                        min={(() => {
                          const today = new Date();
                          const minDate = new Date(today);
                          minDate.setDate(today.getDate() - 7);
                          return minDate;
                        })()}
                        max={(() => {
                          const today = new Date();
                          const maxDate = new Date(today);
                          maxDate.setDate(today.getDate() + 7);
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
                name='periodTo'
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>{dict.form.periodTo}</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        modal
                        hideTime
                        value={field.value}
                        onChange={field.onChange}
                        min={form.getValues('periodFrom') || undefined}
                        max={(() => {
                          const today = new Date();
                          const maxDate = new Date(today);
                          maxDate.setDate(today.getDate() + 30);
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
            </div>

            <FormField
              control={form.control}
              name='processSpecification'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.processSpecification}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.form.processSpecificationPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='customerAuthorization'
              render={({ field }) => (
                <FormItem>
                  <div className='space-y-0.5'>
                    <FormLabel>{dict.form.customerAuthorization}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <Separator className='mb-4' />

          <CardFooter className='flex justify-end'>
            {' '}
            {/* Changed justify-between to justify-end */}
            {/* Removed the div containing "Wyczyść" and "Usuń szkic" buttons */}
            <div className='flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:space-x-2'>
              {/* Removed "Zapisz szkic" button */}
              <Button
                disabled={isPendingUpdate} // Updated disabled condition with renamed state
                type='submit'
                className='w-full sm:w-auto'
              >
                {isPendingUpdate ? <Loader className='animate-spin' /> : <Plus />}{' '}
                {/* Use renamed state */}
                {dict.form.saveChangesButton} {/* Renamed button */}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
