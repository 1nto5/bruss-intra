'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { requestPasswordReset, resetPassword } from '../actions';

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
import { Mail, ArrowLeft, KeyRound, Loader } from 'lucide-react';
import LocalizedLink from '@/components/localized-link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Step = 'email' | 'code';

type ForgotPasswordDict = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  brussEmailWarning: string;
  backButton: string;
  sendCodeButton: string;
  codeTitle: string;
  codeDescription: string;
  codeLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  resetPasswordButton: string;
  successTitle: string;
  successDescription: string;
  goToLoginButton: string;
  errors: {
    invalidEmail: string;
    codeMustBe6Digits: string;
    passwordMin8Chars: string;
    passwordsDoNotMatch: string;
    invalidCode: string;
    codeExpired: string;
    genericError: string;
  };
};

export default function ForgotPasswordForm({ dict, lang }: { dict: ForgotPasswordDict; lang: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSchema = z.object({
    email: z.string().email({ message: dict.errors.invalidEmail }),
  });

  const codeSchema = z
    .object({
      resetCode: z.string().length(6, { message: dict.errors.codeMustBe6Digits }),
      password: z.string().min(8, { message: dict.errors.passwordMin8Chars }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: dict.errors.passwordsDoNotMatch,
      path: ['confirmPassword'],
    });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { resetCode: '', password: '', confirmPassword: '' },
  });

  // Watch email to show warning for bruss emails
  const watchedEmail = emailForm.watch('email');
  const showBrussWarning = watchedEmail?.toLowerCase().includes('@bruss-group.com');

  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    try {
      setIsPending(true);
      setError(null);

      const res = await requestPasswordReset(values.email);

      if ('error' in res) {
        setError(dict.errors.genericError);
        return;
      }

      setEmail(values.email);
      setStep('code');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(dict.errors.genericError);
    } finally {
      setIsPending(false);
    }
  }

  async function onCodeSubmit(values: z.infer<typeof codeSchema>) {
    try {
      setIsPending(true);
      setError(null);

      const res = await resetPassword(email, values.resetCode, values.password);

      if ('error' in res) {
        if (res.error === 'invalid_code') {
          setError(dict.errors.invalidCode);
          return;
        }
        if (res.error === 'code_expired') {
          setError(dict.errors.codeExpired);
          return;
        }
        setError(dict.errors.genericError);
        return;
      }

      toast.success(dict.successTitle, {
        description: dict.successDescription,
      });
      router.push(`/${lang}/auth`);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(dict.errors.genericError);
    } finally {
      setIsPending(false);
    }
  }

  if (step === 'code') {
    return (
      <Card className='sm:w-[400px]'>
        <CardHeader>
          <CardTitle>{dict.codeTitle}</CardTitle>
          <CardDescription>{dict.codeDescription}</CardDescription>
        </CardHeader>

        <Form {...codeForm}>
          <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} autoComplete='off'>
            <CardContent className='grid w-full items-center gap-4'>
              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className='space-y-2'>
                <label className='text-sm font-medium leading-none'>
                  {dict.codeLabel}
                </label>
                <Input
                  {...codeForm.register('resetCode')}
                  autoComplete='off'
                  inputMode='numeric'
                />
                {codeForm.formState.errors.resetCode && (
                  <p className='text-sm font-medium text-destructive'>
                    {codeForm.formState.errors.resetCode.message}
                  </p>
                )}
              </div>
              <FormField
                control={codeForm.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.newPasswordLabel}</FormLabel>
                    <FormControl>
                      <Input type='password' autoComplete='new-password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={codeForm.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.confirmPasswordLabel}</FormLabel>
                    <FormControl>
                      <Input type='password' autoComplete='new-password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className='flex justify-between'>
              <Button variant='outline' type='button' onClick={() => setStep('email')}>
                <ArrowLeft /> {dict.backButton}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? <Loader className='animate-spin' /> : <KeyRound />}
                {dict.resetPasswordButton}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    );
  }

  return (
    <Card className='sm:w-[400px]'>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
      </CardHeader>

      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
          <CardContent className='grid w-full items-center gap-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={emailForm.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.emailLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  {showBrussWarning && (
                    <p className='text-sm text-destructive'>{dict.brussEmailWarning}</p>
                  )}
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
            <Button type='submit' disabled={isPending || showBrussWarning}>
              {isPending ? <Loader className='animate-spin' /> : <Mail />}
              {dict.sendCodeButton}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
