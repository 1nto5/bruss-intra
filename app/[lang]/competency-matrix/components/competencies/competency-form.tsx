'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { createCompetencySchema } from '../../lib/zod';
import { PROCESS_AREAS } from '../../lib/types';
import type { CompetencyType } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';
import { insertCompetency, updateCompetency } from '../../actions/competencies';
import type { Locale } from '@/lib/config/i18n';

type CompetencyFormData = z.input<ReturnType<typeof createCompetencySchema>>;

interface CompetencyFormProps {
  dict: Dictionary;
  lang: Locale;
  competency?: CompetencyType;
}

export function CompetencyForm({ dict, lang, competency }: CompetencyFormProps) {
  const router = useRouter();
  const isEditing = !!competency;
  const schema = createCompetencySchema(dict.validation);

  const form = useForm<CompetencyFormData>({
    resolver: zodResolver(schema),
    defaultValues: competency
      ? {
          name: competency.name,
          description: competency.description || { pl: '', de: '', en: '' },
          processArea: competency.processArea,
          levels: competency.levels,
          trainingRecommendation: competency.trainingRecommendation || {
            pl: '',
            de: '',
            en: '',
          },
          helpText: competency.helpText || { pl: '', de: '', en: '' },
          sortOrder: competency.sortOrder,
          active: competency.active,
        }
      : {
          name: { pl: '', de: '', en: '' },
          description: { pl: '', de: '', en: '' },
          processArea: 'production',
          levels: {
            1: { pl: '', de: '', en: '' },
            2: { pl: '', de: '', en: '' },
            3: { pl: '', de: '', en: '' },
          },
          trainingRecommendation: { pl: '', de: '', en: '' },
          helpText: { pl: '', de: '', en: '' },
          sortOrder: 0,
          active: true,
        },
  });

  async function onSubmit(data: CompetencyFormData) {
    const res = isEditing
      ? await updateCompetency(competency!._id!, data, lang)
      : await insertCompetency(data, lang);

    if ('error' in res) {
      if (res.error === 'validation' && res.issues) {
        toast.error(res.issues[0]?.message || dict.errors.contactIT);
      } else if (res.error === 'unauthorized') {
        toast.error(dict.errors.unauthorized);
      } else {
        toast.error(dict.errors.serverError);
      }
      return;
    }

    toast.success(
      isEditing ? dict.competencies.updated : dict.competencies.created,
    );
    router.push(`/${lang}/competency-matrix/competencies`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.competencies.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="name.pl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.competencies.namePl}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name.de"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.competencies.nameDe}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name.en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.competencies.nameEn}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Process area + sort order + active */}
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="processArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.competencies.processArea}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROCESS_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          {dict.processAreas[area]}
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
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.competencies.sortOrder}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 pt-8">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">
                    {dict.active}
                  </FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Level descriptions */}
        {([1, 2, 3] as const).map((level) => (
          <Card key={level}>
            <CardHeader>
              <CardTitle className="text-base">
                {dict.competencies[`level${level}` as keyof typeof dict.competencies]}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(['pl', 'de', 'en'] as const).map((locale) => (
                <FormField
                  key={locale}
                  control={form.control}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  name={`levels.${level}.${locale}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {dict.competencies[`level${level}${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof dict.competencies]}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.competencies.description}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['pl', 'de', 'en'] as const).map((locale) => (
              <FormField
                key={locale}
                control={form.control}
                name={`description.${locale}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {dict.competencies[`description${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof dict.competencies]}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Training Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.competencies.trainingRecommendation}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['pl', 'de', 'en'] as const).map((locale) => (
              <FormField
                key={locale}
                control={form.control}
                name={`trainingRecommendation.${locale}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale.toUpperCase()}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Form actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? dict.loading : dict.save}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${lang}/competency-matrix/competencies`)}
          >
            {dict.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
