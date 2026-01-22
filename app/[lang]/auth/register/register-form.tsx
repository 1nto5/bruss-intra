'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { registerExternalUser } from '../actions';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { UserPlus, ArrowLeft, Loader } from 'lucide-react';
import LocalizedLink from '@/components/localized-link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type RegisterDict = {
  title: string;
  description: string;
  identifier: string;
  email: string;
  password: string;
  confirmPassword: string;
  submitButton: string;
  backButton: string;
  successTitle: string;
  successDescription: string;
  goToLogin: string;
  errors: {
    identifierRequired: string;
    invalidEmail: string;
    brussEmail: string;
    passwordMin: string;
    passwordsDoNotMatch: string;
    emailExists: string;
    identifierExists: string;
    employeeNotFound: string;
    genericError: string;
  };
};

export default function RegisterForm({ dict, lang }: { dict: RegisterDict; lang: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerSchema = z
    .object({
      identifier: z.string().min(1, { message: dict.errors.identifierRequired }),
      email: z
        .string()
        .email({ message: dict.errors.invalidEmail })
        .refine((email) => !email.toLowerCase().includes('@bruss-group.com'), {
          message: dict.errors.brussEmail,
        }),
      password: z.string().min(8, { message: dict.errors.passwordMin }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: dict.errors.passwordsDoNotMatch,
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      identifier: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    try {
      setIsPending(true);
      setError(null);

      const res = await registerExternalUser({
        identifier: values.identifier,
        email: values.email,
        password: values.password,
      });

      if ('error' in res) {
        if (res.error === 'email_exists') {
          setError(dict.errors.emailExists);
        } else if (res.error === 'bruss_email') {
          setError(dict.errors.brussEmail);
        } else if (res.error === 'identifier_exists') {
          setError(dict.errors.identifierExists);
        } else if (res.error === 'employee_not_found') {
          setError(dict.errors.employeeNotFound);
        } else {
          setError(dict.errors.genericError);
        }
        return;
      }

      toast.success(dict.successTitle, {
        description: dict.successDescription,
      });
      router.push(`/${lang}/auth`);
    } catch (err) {
      console.error('Registration error:', err);
      setError(dict.errors.genericError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className='sm:w-[450px]'>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <CardContent className='grid w-full items-center gap-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name='identifier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.identifier}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.email}</FormLabel>
                  <FormControl>
                    <Input type='email' autoComplete='off' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.password}</FormLabel>
                  <FormControl>
                    <Input type='password' autoComplete='off' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input type='password' autoComplete='off' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className='flex justify-between'>
            <LocalizedLink href='/auth'>
              <Button variant='outline' type='button'>
                <ArrowLeft /> {dict.backButton}
              </Button>
            </LocalizedLink>
            <Button type='submit' disabled={isPending}>
              {isPending ? <Loader className='animate-spin' /> : <UserPlus />}
              {dict.submitButton}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
