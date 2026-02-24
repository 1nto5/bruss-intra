'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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

import { createCertTypeSchema } from '../../lib/zod';
import type { ConfigValue } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';
import {
  insertCertificationType,
  updateCertificationType,
} from '../../actions/cert-types';
import type { Locale } from '@/lib/config/i18n';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type CertTypeFormData = z.input<ReturnType<typeof createCertTypeSchema>>;

interface CertTypeFormProps {
  dict: Dictionary;
  lang: Locale;
  certType?: ConfigValue;
}

export function CertTypeForm({ dict, lang, certType }: CertTypeFormProps) {
  const router = useRouter();
  const isEditing = !!certType;
  const schema = createCertTypeSchema(dict.validation);

  const form = useForm<CertTypeFormData>({
    resolver: zodResolver(schema),
    defaultValues: certType
      ? {
          slug: certType.slug,
          name: {
            pl: certType.name.pl,
            en: certType.name.en || '',
            de: certType.name.de || '',
          },
          active: certType.active,
        }
      : {
          slug: '',
          name: { pl: '', en: '', de: '' },
          active: true,
        },
  });

  async function onSubmit(data: CertTypeFormData) {
    // Auto-generate slug from EN name (fallback to PL) for new cert types
    if (!isEditing) {
      const slugSource = data.name.en?.trim() || data.name.pl;
      data.slug = slugify(slugSource);
    }

    const res = isEditing
      ? await updateCertificationType(certType!.slug, data, lang)
      : await insertCertificationType(data, lang);

    if ('error' in res) {
      if (res.error === 'validation' && 'issues' in res && res.issues) {
        toast.error(res.issues[0]?.message || dict.errors.contactIT);
      } else if (res.error === 'unauthorized') {
        toast.error(dict.errors.unauthorized);
      } else {
        toast.error(dict.errors.serverError);
      }
      return;
    }

    toast.success(
      isEditing ? dict.settings.certTypeUpdated : dict.settings.certTypeCreated,
    );
    router.push(`/${lang}/competency-matrix/settings/cert-types`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? dict.settings.editCertType : dict.settings.addCertType}
        </CardTitle>
      </CardHeader>
      <Separator className="mb-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid w-full items-center gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="name.pl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.settings.namePl}</FormLabel>
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
                    <FormLabel>{dict.settings.nameEn}</FormLabel>
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
                    <FormLabel>{dict.settings.nameDe}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
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
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/${lang}/competency-matrix/settings/cert-types`)
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
