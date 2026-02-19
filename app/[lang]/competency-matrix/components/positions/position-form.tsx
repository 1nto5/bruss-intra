'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { createPositionSchema } from '../../lib/zod';
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  CERTIFICATION_TYPES,
} from '../../lib/types';
import type {
  PositionType,
  CompetencyType,
  RequiredCompetency,
} from '../../lib/types';
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  CERTIFICATION_TYPE_LABELS,
} from '../../lib/constants';
import { localize } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';
import { insertPosition, updatePosition } from '../../actions/positions';
import { RequirementsEditor } from './requirements-editor';
import type { Locale } from '@/lib/config/i18n';

type PositionFormData = z.input<ReturnType<typeof createPositionSchema>>;

interface PositionFormProps {
  dict: Dictionary;
  lang: Locale;
  competencies: CompetencyType[];
  departments: string[];
  position?: PositionType;
}

export function PositionForm({
  dict,
  lang,
  competencies,
  departments,
  position,
}: PositionFormProps) {
  const router = useRouter();
  const isEditing = !!position;
  const schema = createPositionSchema(dict.validation);
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as
    | 'pl'
    | 'de'
    | 'en';

  const form = useForm<PositionFormData>({
    resolver: zodResolver(schema),
    defaultValues: position
      ? {
          name: position.name,
          department: position.department,
          requiredCompetencies: position.requiredCompetencies,
          requiredExperience: position.requiredExperience,
          requiredEducation: position.requiredEducation,
          requiredCertifications: position.requiredCertifications,
          active: position.active,
        }
      : {
          name: { pl: '', de: '', en: '' },
          department: '',
          requiredCompetencies: [],
          requiredExperience: 'none',
          requiredEducation: 'none',
          requiredCertifications: [],
          active: true,
        },
  });

  async function onSubmit(data: PositionFormData) {
    const res = isEditing
      ? await updatePosition(position!._id!, data, lang)
      : await insertPosition(data, lang);

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
      isEditing ? dict.positions.updated : dict.positions.created,
    );
    router.push(`/${lang}/competency-matrix/positions`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.positions.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['pl', 'de', 'en'] as const).map((locale) => (
              <FormField
                key={locale}
                control={form.control}
                name={`name.${locale}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {dict.positions[`name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof dict.positions]}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Department + Experience + Education + Active */}
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.department}</FormLabel>
                  <FormControl>
                    <Input {...field} list="departments-list" />
                  </FormControl>
                  <datalist id="departments-list">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.requiredExperience}</FormLabel>
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
                      {EXPERIENCE_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {localize(EXPERIENCE_LEVEL_LABELS[lvl], safeLang)}
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
              name="requiredEducation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.positions.requiredEducation}</FormLabel>
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
                      {EDUCATION_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {localize(EDUCATION_LEVEL_LABELS[lvl], safeLang)}
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
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 pt-8">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">{dict.active}</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Required Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.positions.requiredCertifications}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="requiredCertifications"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATION_TYPES.map((certType) => {
                      const isSelected = field.value?.includes(certType);
                      return (
                        <Button
                          key={certType}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const current = field.value || [];
                            field.onChange(
                              isSelected
                                ? current.filter((c: string) => c !== certType)
                                : [...current, certType],
                            );
                          }}
                        >
                          {localize(CERTIFICATION_TYPE_LABELS[certType], safeLang)}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Required Competencies Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.positions.requiredCompetencies}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="requiredCompetencies"
              render={({ field }) => (
                <FormItem>
                  <RequirementsEditor
                    competencies={competencies}
                    requirements={field.value as RequiredCompetency[]}
                    onChange={field.onChange}
                    dict={dict}
                    lang={safeLang}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
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
            onClick={() =>
              router.push(`/${lang}/competency-matrix/positions`)
            }
          >
            {dict.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
