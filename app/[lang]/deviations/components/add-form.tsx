'use client';
import {
  DeviationAreaType,
  DeviationReasonType,
} from '@/app/[lang]/deviations/lib/types';
import {
  createAddDeviationSchema,
  createAddDeviationDraftSchema,
} from '@/app/[lang]/deviations/lib/zod';
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
import { Eraser, Loader, Pencil, Plus, Search, Table } from 'lucide-react';
import { useState, useTransition } from 'react';
import LocalizedLink from '@/components/localized-link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  findArticleName,
  insertDeviation,
  insertDraftDeviation,
  redirectToDeviations,
} from '../actions';
import { Dictionary } from '../lib/dict';

export default function AddDeviationForm({
  reasonOptions,
  areaOptions,
  lang,
  dict,
}: {
  reasonOptions: DeviationReasonType[];
  areaOptions: DeviationAreaType[];
  lang: Locale;
  dict: Dictionary;
}) {
  // const [isDraft, setIsDraft] = useState<boolean>();
  const [isPendingInsert, setIsPendingInserting] = useState(false);
  const [isPendingInsertDraft, setIsPendingInsertingDraft] = useState(false);
  const [isPendingFindArticleName, startFindArticleNameTransition] =
    useTransition();

  const addDeviationSchema = createAddDeviationSchema(dict.form.validation);
  const addDeviationDraftSchema = createAddDeviationDraftSchema(dict.form.validation);

  const form = useForm<z.infer<typeof addDeviationSchema>>({
    resolver: zodResolver(addDeviationSchema),
    defaultValues: {
      articleNumber: '',
      articleName: '',
      workplace: '',
      // drawingNumber: '', // Assuming this might be added later or is optional
      quantity: '',
      unit: undefined, // Set a default unit
      charge: '',
      description: '',
      reason: undefined, // Explicitly undefined for radio group
      periodFrom: undefined,
      periodTo: undefined,
      area: undefined, // Explicitly undefined for radio group
      processSpecification: '',
      customerNumber: '',
      customerName: '', // Added customerName default
      customerAuthorization: false,
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
    // setIsDraft(false);
    setIsPendingInserting(true);
    try {
      const res = await insertDeviation(data);
      if (res.success) {
        toast.success(dict.form.deviationAdded);
        // form.reset()
        redirectToDeviations(lang);
      } else if (res.error) {
        console.error(res.error);
        toast.error(dict.form.contactIT);
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.form.contactIT);
    } finally {
      setIsPendingInserting(false);
    }
  };

  const handleDraftInsert = async (
    data: z.infer<typeof addDeviationDraftSchema>,
  ) => {
    setIsPendingInsertingDraft(true);
    try {
      const res = await insertDraftDeviation(data);
      if (res.success) {
        toast.success(dict.form.draftSaved);
        // form.reset();
        redirectToDeviations(lang);
      } else if (res.error) {
        console.error(res.error);
        toast.error(dict.form.contactIT);
      }
    } catch (error) {
      console.error('handleDraftInsert', error);
      toast.error(dict.form.contactIT);
    } finally {
      setIsPendingInsertingDraft(false);
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.form.title}</CardTitle>
          <LocalizedLink href='/deviations'>
            <Button variant='outline'>
              <Table /> <span>{dict.form.tableLink}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className='grid w-full items-center gap-4'>
            {/* <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'> */}
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
            {/* </div> */}

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
                        // defaultValue={field.value}
                        className='flex flex-row sm:flex-col'
                      >
                        <FormItem
                          key={'pc'}
                          className='flex items-center space-y-0 space-x-3'
                        >
                          <FormControl>
                            <RadioGroupItem value='pcs' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {dict.form.pcs}
                          </FormLabel>
                        </FormItem>
                        <FormItem
                          key={'kg'}
                          className='ml-4 flex items-center space-y-0 space-x-3 sm:ml-0'
                        >
                          <FormControl>
                            <RadioGroupItem value='kg' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {dict.form.kg}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
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
                  <FormMessage />
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
                    {/* <FormDescription>
                    Receive emails about your account security.
                  </FormDescription> */}
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      // disabled
                      // aria-readonly
                    />
                  </FormControl>
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
              <Eraser className='' />
              {dict.form.clearButton}
            </Button>
            <div className='flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:space-x-2'>
              <Button
                variant='secondary'
                type='button'
                onClick={() => handleDraftInsert(form.getValues())}
                disabled={isPendingInsertDraft}
                className='w-full sm:w-auto'
              >
                {isPendingInsertDraft ? (
                  <Loader className='animate-spin' />
                ) : (
                  <Pencil />
                )}
                {dict.form.saveDraftButton}
              </Button>

              <Button
                disabled={isPendingInsert}
                type='submit'
                className='w-full sm:w-auto'
              >
                {isPendingInsert ? <Loader className='animate-spin' /> : <Plus />}
                {dict.form.addDeviationButton}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
