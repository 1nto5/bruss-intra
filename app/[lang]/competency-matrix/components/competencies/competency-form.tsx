'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { createCompetencySchema } from '../../lib/zod';
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
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing
            ? dict.competencies.editTitle
            : dict.competencies.addTitle}
        </CardTitle>
      </CardHeader>
      <Separator className="mb-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Name fields */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                {dict.competencies.name}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(['pl', 'en', 'de'] as const).map((locale) => (
                  <FormField
                    key={locale}
                    control={form.control}
                    name={`name.${locale}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{locale.toUpperCase()}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Level descriptions */}
            {([1, 2, 3] as const).map((level) => (
              <div key={level} className="space-y-3">
                <h3 className="text-sm font-medium">
                  {String(dict.competencies[`level${level}` as keyof typeof dict.competencies])}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(['pl', 'en', 'de'] as const).map((locale) => (
                    <FormField
                      key={locale}
                      control={form.control}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      name={`levels.${level}.${locale}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{locale.toUpperCase()}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                {dict.competencies.description}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(['pl', 'en', 'de'] as const).map((locale) => (
                  <FormField
                    key={locale}
                    control={form.control}
                    name={`description.${locale}`}
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
              </div>
            </div>

            {/* Training Recommendation */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                {dict.competencies.trainingRecommendation}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(['pl', 'en', 'de'] as const).map((locale) => (
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
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/${lang}/competency-matrix/competencies`)
              }
            >
              {dict.cancel}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? dict.loading : dict.save}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
