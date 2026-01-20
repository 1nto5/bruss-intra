'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import LocalizedLink from '@/components/localized-link';
import { ArrowLeft, CircleX, Copy, Plus } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { DateTimeInput } from '@/components/ui/datetime-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { insertItem as insert } from '../../actions/crud';
import { redirectToInventory as redirect } from '../../actions/utils';
import { createNewItemSchema } from '../../lib/zod';
import { Dictionary } from '../../lib/dict';
import { Locale } from '@/lib/config/i18n';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  CONNECTION_TYPES,
  ASSET_ID_PREFIXES
} from '../../lib/types';
import * as z from 'zod';

export default function NewItemForm({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: Locale;
}) {
  const [isPendingInsert, setIsPendingInserting] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'save-and-add-another'>('save');

  const schema = createNewItemSchema(dict.validation);
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: undefined,
      assetNumber: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      purchaseDate: new Date(),
      statuses: [],
      connectionType: undefined,
      ipAddress: '',
      lastReview: undefined,
      notes: '',
      department: '',
    },
  });

  const watchCategory = form.watch('category');
  const watchAssetNumber = form.watch('assetNumber');

  // Calculate asset ID preview
  const assetIdPreview = watchCategory && watchAssetNumber
    ? `${ASSET_ID_PREFIXES[watchCategory]}${watchAssetNumber}`
    : '';

  // Check if category requires connectionType
  const requiresConnectionType = watchCategory && [
    'printer',
    'label-printer',
    'portable-scanner',
  ].includes(watchCategory);

  // Auto-set manufacturer to Apple for iPhone category
  useEffect(() => {
    if (watchCategory === 'iphone') {
      form.setValue('manufacturer', 'Apple');
    }
  }, [watchCategory, form]);

  async function onSubmit(data: FormData) {
    setIsPendingInserting(true);

    try {
      const result = await insert(data);

      if ('error' in result) {
        // Show translated message for known errors
        if (result.error === 'Asset ID already exists') {
          toast.error(dict.toast.assetIdDuplicate);
        } else {
          toast.error(result.error);
        }
        setIsPendingInserting(false);
        return;
      }

      toast.success(dict.toast.itemCreated);

      if (actionType === 'save') {
        redirect(lang);
      } else {
        // Reset form for new entry
        form.reset({
          category: data.category, // Keep category selected
          assetNumber: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          purchaseDate: new Date(),
          statuses: [],
          connectionType: data.connectionType,
          ipAddress: '',
          lastReview: undefined,
          notes: '',
          department: '',
        });
        setIsPendingInserting(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(dict.toast.error);
      setIsPendingInserting(false);
    }
  }

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>{dict.form.newItem.title}</CardTitle>
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
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.category}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={dict.common.select} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EQUIPMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {dict.categories[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asset Number - Hide for monitors */}
            {watchCategory !== 'monitor' && (
              <FormField
                control={form.control}
                name="assetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.newItem.assetNumber}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="001, 042, 123..."
                        {...field}
                      />
                    </FormControl>
                    {assetIdPreview && (
                      <FormDescription>
                        Preview: <strong>{assetIdPreview}</strong>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Manufacturer */}
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.manufacturer}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={watchCategory === 'iphone'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.model}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Serial Number */}
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.serialNumber}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purchase Date */}
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{dict.form.newItem.purchaseDate}</FormLabel>
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

            {/* Last Review Date */}
            <FormField
              control={form.control}
              name="lastReview"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{dict.form.newItem.lastReview}</FormLabel>
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

            {/* Statuses (Multi-select) */}
            <FormField
              control={form.control}
              name="statuses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.statuses}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={EQUIPMENT_STATUSES.map((status) => ({
                        value: status,
                        label: dict.statuses[status],
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={dict.common.select}
                      emptyText={dict.table.noResults}
                      clearLabel={dict.common.clear}
                      selectedLabel={dict.bulk.selected}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Connection Type (conditional) */}
            {requiresConnectionType && (
              <FormField
                control={form.control}
                name="connectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.newItem.connectionType}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={dict.common.select} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONNECTION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {dict.connectionTypes[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* IP Address (optional) */}
            {requiresConnectionType && (
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.newItem.ipAddress}</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.notes}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.newItem.department}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                onClick={() => {
                  setActionType('save-and-add-another');
                  form.handleSubmit(onSubmit)();
                }}
                disabled={isPendingInsert}
                className='w-full sm:w-auto'
              >
                <Copy />
                {dict.common.saveAndAddAnother}
              </Button>
              <Button
                type='button'
                onClick={() => {
                  setActionType('save');
                  form.handleSubmit(onSubmit)();
                }}
                className='w-full sm:w-auto'
                disabled={isPendingInsert}
              >
                <Plus />
                {dict.common.save}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
