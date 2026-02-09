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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Locale } from '@/lib/config/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { insertConfig, updateConfig } from '../actions/crud';
import { redirectToConfigs } from '../actions/utils';
import { Dictionary } from '../lib/dict';
import { DmcheckConfigFull } from '../lib/types';
import { createDmcheckConfigSchema } from '../lib/zod';

interface ConfigFormProps {
  mode: 'create' | 'edit';
  config?: DmcheckConfigFull;
  dict: Dictionary;
  lang: Locale;
  workplaces: string[];
}

export default function ConfigForm({
  mode,
  config,
  dict,
  lang,
  workplaces,
}: ConfigFormProps) {
  const [isPending, setIsPending] = useState(false);

  const isCustomWorkplace =
    config?.workplace && !workplaces.includes(config.workplace);
  const [useCustomWorkplace, setUseCustomWorkplace] =
    useState(!!isCustomWorkplace);

  const schema = createDmcheckConfigSchema(dict.validation);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      workplace: config?.workplace ?? '',
      articleNumber: config?.articleNumber ?? '',
      articleName: config?.articleName ?? '',
      articleNote: config?.articleNote ?? '',
      piecesPerBox: config?.piecesPerBox ?? 1,
      dmc: config?.dmc ?? '',
      dmcFirstValidation: config?.dmcFirstValidation ?? '',
      secondValidation: config?.secondValidation ?? false,
      dmcSecondValidation: config?.dmcSecondValidation ?? '',
      hydraProcess: config?.hydraProcess ?? '',
      ford: config?.ford ?? false,
      bmw: config?.bmw ?? false,
      nonUniqueHydraBatch: config?.nonUniqueHydraBatch ?? false,
      requireDmcPartVerification:
        config?.requireDmcPartVerification ?? false,
      enableDefectReporting: config?.enableDefectReporting ?? false,
      requireDefectApproval: config?.requireDefectApproval ?? false,
      defectGroup: config?.defectGroup ?? '',
    },
  });

  const secondValidation = form.watch('secondValidation');
  const enableDefectReporting = form.watch('enableDefectReporting');

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsPending(true);
    try {
      const res =
        mode === 'create'
          ? await insertConfig(data, lang)
          : await updateConfig(config!._id, data, lang);

      if ('success' in res) {
        toast.success(
          mode === 'create' ? dict.toast.inserted : dict.toast.updated,
        );
        redirectToConfigs(lang);
      } else if ('error' in res) {
        if (res.error === 'validation' && res.issues) {
          toast.error(res.issues[0]?.message || dict.errors.contactIT);
        } else if (res.error === 'unauthorized') {
          toast.error(dict.errors.unauthorized);
        } else if (res.error === 'duplicate config') {
          toast.error(dict.errors.duplicateConfig);
        } else if (res.error === 'not found') {
          toast.error(dict.errors.notFound);
        } else {
          toast.error(dict.errors.contactIT);
        }
      }
    } catch {
      toast.error(dict.errors.contactIT);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className='sm:w-[768px]'>
      <CardHeader>
        <div className='space-y-2 sm:flex sm:justify-between sm:gap-4'>
          <CardTitle>
            {mode === 'create' ? dict.form.titleNew : dict.form.titleEdit}
          </CardTitle>
          <LocalizedLink href='/dmcheck-configs'>
            <Button variant='outline'>
              <ArrowLeft /> <span>{dict.form.backToList}</span>
            </Button>
          </LocalizedLink>
        </div>
      </CardHeader>
      <Separator className='mb-4' />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Section 1: Basic Info */}
          <CardContent className='grid w-full items-center gap-4'>
            <h3 className='text-lg font-semibold'>{dict.sections.basic}</h3>
            <FormField
              control={form.control}
              name='workplace'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.workplace}</FormLabel>
                  <FormControl>
                    {useCustomWorkplace ? (
                      <div className='flex gap-2'>
                        <Input
                          {...field}
                          placeholder={dict.form.workplaceCustom}
                          className='flex-1'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setUseCustomWorkplace(false);
                            field.onChange('');
                          }}
                        >
                          {dict.actions.cancel}
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setUseCustomWorkplace(true);
                            field.onChange('');
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={dict.form.workplace}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='custom'>
                            {dict.form.workplaceCustom}
                          </SelectItem>
                          {workplaces.map((wp) => (
                            <SelectItem key={wp} value={wp}>
                              {wp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='articleNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.articleNumber}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='articleName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.articleName}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='articleNote'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.articleNote}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='piecesPerBox'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.piecesPerBox}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator className='mb-4' />

          {/* Section 2: DMC Validation */}
          <CardContent className='grid w-full items-center gap-4'>
            <h3 className='text-lg font-semibold'>
              {dict.sections.dmcValidation}
            </h3>
            <FormField
              control={form.control}
              name='dmc'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.dmc}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='dmcFirstValidation'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.dmcFirstValidation}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='secondValidation'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>{dict.form.secondValidation}</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {secondValidation && (
              <FormField
                control={form.control}
                name='dmcSecondValidation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.dmcSecondValidation}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='ford'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>{dict.form.ford}</FormLabel>
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
              name='bmw'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>{dict.form.bmw}</FormLabel>
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

          {/* Section 3: Hydra */}
          <CardContent className='grid w-full items-center gap-4'>
            <h3 className='text-lg font-semibold'>{dict.sections.hydra}</h3>
            <FormField
              control={form.control}
              name='hydraProcess'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.hydraProcess}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='nonUniqueHydraBatch'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>{dict.form.nonUniqueHydraBatch}</FormLabel>
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

          {/* Section 4: Quality / Defects */}
          <CardContent className='grid w-full items-center gap-4'>
            <h3 className='text-lg font-semibold'>{dict.sections.quality}</h3>
            <FormField
              control={form.control}
              name='requireDmcPartVerification'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>
                    {dict.form.requireDmcPartVerification}
                  </FormLabel>
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
              name='enableDefectReporting'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <FormLabel>{dict.form.enableDefectReporting}</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {enableDefectReporting && (
              <>
                <FormField
                  control={form.control}
                  name='requireDefectApproval'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <FormLabel>
                        {dict.form.requireDefectApproval}
                      </FormLabel>
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
                  name='defectGroup'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dict.form.defectGroup}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>

          <Separator className='mb-4' />
          <CardFooter className='flex justify-end'>
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <Loader className='animate-spin' />
              ) : mode === 'create' ? (
                <Plus />
              ) : (
                <Save />
              )}
              {dict.actions.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
