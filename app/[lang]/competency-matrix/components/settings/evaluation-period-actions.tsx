'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  activateEvaluationPeriod,
  closeEvaluationPeriod,
} from '../../actions/evaluation-periods';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface EvaluationPeriodActionsProps {
  period: {
    _id: string;
    status: string;
  };
  dict: Dictionary;
  lang: Locale;
}

export function EvaluationPeriodActions({
  period,
  dict,
  lang,
}: EvaluationPeriodActionsProps) {
  const router = useRouter();

  async function handleActivate() {
    const res = await activateEvaluationPeriod(period._id);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.settings.periodActivated);
      router.refresh();
    }
  }

  async function handleClose() {
    const res = await closeEvaluationPeriod(period._id);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.settings.periodClosed);
      router.refresh();
    }
  }

  if (period.status === 'planned') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">{dict.settings.activate}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.settings.activate}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.settings.activateConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>
              {dict.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (period.status === 'active') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline">
            {dict.settings.close}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.settings.close}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.settings.closeConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              {dict.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return <span className="text-sm text-muted-foreground">-</span>;
}
