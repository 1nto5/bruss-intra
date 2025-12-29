'use client';

import { InventoryPositionForEdit } from '@/lib/data/get-inventory-position';
import { createUpdatePositionSchema } from '../../../lib/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { extractNameFromEmail } from '@/lib/utils/name-format';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  updatePosition as update,
  redirectToCardPositions,
  getBinsForWarehouse,
} from '../../../actions';
import { Dictionary } from '../../../lib/dict';
import LocalizedLink from '@/components/localized-link';
import { getWarehouseConfig } from '@/lib/data/get-inventory-filter-options';

export default function EditPositionForm({
  position,
  dict,
  lang,
  cardNumber,
}: {
  position: InventoryPositionForEdit;
  dict: Dictionary;
  lang: string;
  cardNumber: string;
}) {
  const [pendingAction, setPendingAction] = useState<'save' | 'approve' | null>(null);
  const [isPendingFindBin, setIsPendingFindBin] = useState(false);
  const [foundBins, setFoundBins] = useState<{ value: string; label: string }[]>([]);
  const [findBinMessage, setFindBinMessage] = useState('');
  const [warehouseConfig, setWarehouseConfig] = useState<{
    has_bins: boolean;
    has_sectors: boolean;
  } | null>(null);
  const binDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch warehouse config on mount
  useEffect(() => {
    const loadWarehouseConfig = async () => {
      const config = await getWarehouseConfig(position.warehouse);
      if (config) {
        setWarehouseConfig({
          has_bins: config.has_bins,
          has_sectors: config.has_sectors,
        });
      }
    };
    loadWarehouseConfig();
  }, [position.warehouse]);

  const updatePositionSchema = createUpdatePositionSchema(
    dict.validation,
    { hasBins: warehouseConfig?.has_bins ?? false }
  );

  const form = useForm<z.infer<typeof updatePositionSchema>>({
    resolver: zodResolver(updatePositionSchema) as any,
    defaultValues: {
      articleNumber: position.articleNumber,
      quantity: position.quantity,
      wip: position.wip,
      unit: '',
      comment: position.comment || '',
      bin: position.bin || '',
      deliveryDate: position.deliveryDate ? new Date(position.deliveryDate) : undefined,
      approved: position.approver ? true : false,
    },
  });

  type BinOption = { value: string; label: string };

  // Load existing bin on mount if position has a bin value
  useEffect(() => {
    const loadExistingBin = async () => {
      if (position.bin && position.bin.trim() !== '' && warehouseConfig?.has_bins) {
        const res = await getBinsForWarehouse(position.warehouse, position.bin);
        if (res.success && res.success.length > 0) {
          setFoundBins(res.success as BinOption[]);
          setFindBinMessage('success');
        }
      }
    };
    loadExistingBin();
  }, [position.bin, position.warehouse, warehouseConfig]);

  const performBinSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      setIsPendingFindBin(false);
      setFindBinMessage('');
      setFoundBins([]);
      return;
    }

    try {
      const res = await getBinsForWarehouse(position.warehouse, searchValue);
      if ('error' in res) {
        switch (res.error) {
          case 'no bins':
            setFindBinMessage(dict.editPage.noBins || 'No bins found');
            setFoundBins([]);
            break;
          case 'too many bins':
            setFindBinMessage(dict.editPage.tooManyBins || 'Too many results - refine search');
            setFoundBins([]);
            break;
          default:
            toast.error(dict.editPage.error);
        }
        return;
      }
      setFindBinMessage('success');
      setFoundBins(res.success as BinOption[]);
    } catch (error) {
      toast.error(dict.editPage.error);
    } finally {
      setIsPendingFindBin(false);
    }
  }, [dict.editPage, position.warehouse]);

  const handleFindBin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (binDebounceTimeout.current) {
      clearTimeout(binDebounceTimeout.current);
    }

    if (value.trim()) {
      setIsPendingFindBin(true);
      binDebounceTimeout.current = setTimeout(() => {
        performBinSearch(value);
      }, 300);
    } else {
      setIsPendingFindBin(false);
      setFindBinMessage('');
      setFoundBins([]);
    }
  };

  const onSubmit = async (data: z.infer<typeof updatePositionSchema>) => {
    try {
      const res = await update(position.identifier, data);
      if (res.success) {
        toast.success(dict.editPage.success);
        redirectToCardPositions(lang, cardNumber);
      } else if (res.error === 'article not found') {
        form.setError('articleNumber', {
          message: dict.editPage.articleNotFound,
        });
      } else if (res.error === 'wip not allowed') {
        form.setError('wip', { message: dict.editPage.wipNotAllowed });
      } else if (res.error === 'bin required') {
        form.setError('bin', {
          message: dict.editPage.binRequired || 'BIN is required for this warehouse',
        });
      } else if (res.error === 'bin not allowed') {
        form.setError('bin', {
          message: dict.editPage.binNotAllowed || 'BIN is not allowed for this warehouse',
        });
      } else if (res.error === 'unauthorized') {
        toast.error(dict.editPage.unauthorized);
      } else if (res.error) {
        console.error(res.error);
        toast.error(dict.editPage.error);
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.editPage.error);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <div>
          <CardTitle>
            {dict.editPage.title} {position.identifier}
          </CardTitle>
          {position.approver && position.approvedAt && (
            <CardDescription className='mt-1'>
              {dict.positions.approved}: {new Date(position.approvedAt).toLocaleTimeString('pl', { hour: '2-digit', minute: '2-digit' })} {dict.editPage.by} {extractNameFromEmail(position.approver)}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className='grid gap-4'>
            <FormField
              control={form.control}
              name='articleNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.articleNumber}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.quantity}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='wip'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {dict.positions.wip}
                    </FormLabel>
                  </div>
                  <FormMessage />
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='approved'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {dict.positions.approved}
                    </FormLabel>
                    {position.approver && (
                      <FormDescription>
                        {dict.positions.approver}: {extractNameFromEmail(position.approver)}
                      </FormDescription>
                    )}
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

            {/* BIN & Delivery Date - conditionally render only if warehouse has bins */}
            {warehouseConfig?.has_bins && (
              <>
                {/* BIN Search */}
                <FormField
                  control={form.control}
                  name='bin'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {dict.positions.bin}
                        <span className='text-red-500 ml-1'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={dict.editPage.searchBinPlaceholder || 'Search bin...'}
                          onChange={(e) => {
                            handleFindBin(e);
                          }}
                          defaultValue={position.bin || ''}
                        />
                      </FormControl>
                      {isPendingFindBin && (
                        <FormDescription className='flex items-center gap-2'>
                          <Loader2 className='h-3 w-3 animate-spin' />
                          {dict.editPage.searching || 'Searching...'}
                        </FormDescription>
                      )}
                      {findBinMessage && findBinMessage !== 'success' && !isPendingFindBin && (
                        <FormMessage>{findBinMessage}</FormMessage>
                      )}
                      {foundBins.length > 0 && !isPendingFindBin && (
                        <Card className='mt-2'>
                          <CardContent className='p-3'>
                            <RadioGroup
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                              value={field.value}
                              className='space-y-1'
                            >
                              {foundBins.map((bin) => (
                                <div key={bin.value} className='flex items-center space-x-2'>
                                  <RadioGroupItem value={bin.value} id={bin.value} />
                                  <Label htmlFor={bin.value} className='font-normal cursor-pointer'>
                                    {bin.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </CardContent>
                        </Card>
                      )}
                    </FormItem>
                  )}
                />

                {/* Delivery Date */}
                <FormField
                  control={form.control}
                  name='deliveryDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.positions.deliveryDate}</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          modal
                          hideTime
                          value={field.value}
                          onChange={field.onChange}
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
              </>
            )}

            <FormField
              control={form.control}
              name='comment'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.comment}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator className='mb-4' />

          <CardFooter className='flex flex-col gap-3'>
            <div className='flex flex-col gap-3 w-full sm:flex-row'>
              {!position.approver && (
                <Button
                  type='button'
                  disabled={pendingAction !== null}
                  className='w-full sm:flex-1'
                  onClick={() => {
                    setPendingAction('approve');
                    form.setValue('approved', true);
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {pendingAction === 'approve' && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  {dict.editPage.approveAndSave || 'Approve & Save'}
                </Button>
              )}
              <Button
                type='button'
                variant={position.approver ? 'default' : 'secondary'}
                disabled={pendingAction !== null}
                className='w-full sm:flex-1'
                onClick={() => {
                  setPendingAction('save');
                  form.handleSubmit(onSubmit)();
                }}
              >
                {pendingAction === 'save' && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {dict.editPage.save}
              </Button>
            </div>
            <LocalizedLink href={`/inventory/${cardNumber}`} className='w-full'>
              <Button type='button' variant='outline' className='w-full'>
                {dict.editPage.discard}
              </Button>
            </LocalizedLink>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
