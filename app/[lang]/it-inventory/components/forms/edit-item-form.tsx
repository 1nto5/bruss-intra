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
import { ArrowLeft, CircleX, Save } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateItem as update } from '../../actions/crud';
import { createEditItemSchema } from '../../lib/zod';
import { Dictionary } from '../../lib/dict';
import { Locale } from '@/lib/config/i18n';
import {
  ITInventoryItem,
  EQUIPMENT_STATUSES,
  CONNECTION_TYPES,
  ASSET_ID_PREFIXES,
} from '../../lib/types';
import * as z from 'zod';

export default function EditItemForm({
  item,
  dict,
  lang,
}: {
  item: ITInventoryItem;
  dict: Dictionary;
  lang: Locale;
}) {
  const router = useRouter();
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);

  // Extract assetNumber from assetId (remove prefix)
  const prefix = ASSET_ID_PREFIXES[item.category];
  const currentAssetNumber = item.assetId.replace(prefix, '');

  const schema = createEditItemSchema(dict.validation);
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetNumber: currentAssetNumber,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      purchaseDate: new Date(item.purchaseDate),
      lastReview: item.lastReview ? new Date(item.lastReview) : undefined,
      statuses: item.statuses,
      connectionType: item.connectionType,
      ipAddress: item.ipAddress || '',
      notes: item.notes || '',
      department: item.department || '',
    },
  });

  // Check if category requires connectionType
  const requiresConnectionType = [
    'printer',
    'label-printer',
    'portable-scanner',
  ].includes(item.category);

  // Auto-set manufacturer to Apple for iPhone category
  useEffect(() => {
    if (item.category === 'iphone') {
      form.setValue('manufacturer', 'Apple');
    }
  }, [item.category, form]);

  async function onSubmit(data: FormData) {
    setIsPendingUpdate(true);

    try {
      const result = await update(item._id, data);

      if ('error' in result) {
        // Show translated message for known errors
        if (result.error === 'Asset ID already exists') {
          toast.error(dict.toast.assetIdDuplicate);
        } else {
          toast.error(dict.toast.contactIT);
        }
        setIsPendingUpdate(false);
        return;
      }

      toast.success(dict.toast.itemUpdated);
      router.push(`/${lang}/it-inventory/${item._id}`);
    } catch (error) {
      console.error(error);
      toast.error(dict.toast.error);
      setIsPendingUpdate(false);
    }
  }

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <div>
            <CardTitle>{dict.form.editItem.title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {dict.table.columns.assetId}: <strong>{item.assetId}</strong> | {dict.table.columns.category}: <strong>{dict.categories[item.category]}</strong>
            </div>
          </div>
          <LocalizedLink href={`/it-inventory/${item._id}`}>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.form.editItem.backToItem}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Asset Number (not for monitors - auto-generated) */}
            {item.category !== 'monitor' && (
              <FormField
                control={form.control}
                name="assetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.newItem.assetNumber}</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{prefix}</span>
                      <FormControl>
                        <Input {...field} className="flex-1" />
                      </FormControl>
                    </div>
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
                    <Input {...field} disabled={item.category === 'iphone'} />
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
              render={({ field }) => {
                // Filter out 'in-stock' if item is assigned to employee
                const availableStatuses = item.currentAssignment
                  ? EQUIPMENT_STATUSES.filter(status => status !== 'in-stock')
                  : EQUIPMENT_STATUSES;

                return (
                  <FormItem>
                    <FormLabel>{dict.form.newItem.statuses}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={availableStatuses.map((status) => ({
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
                    {item.currentAssignment && (
                      <p className="text-sm text-muted-foreground">
                        {dict.validation.cannotHaveNaStanieWhenAssigned}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
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
              disabled={isPendingUpdate}
            >
              <CircleX />
              {dict.common.clear}
            </Button>
            <Button
              type='submit'
              className='w-full sm:w-auto'
              disabled={isPendingUpdate}
            >
              <Save />
              {dict.common.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
