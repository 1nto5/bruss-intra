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
import { approveAssessment } from '../../actions/assessments';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface ApproveButtonProps {
  assessmentId: string;
  dict: Dictionary;
  lang: Locale;
}

export function ApproveButton({ assessmentId, dict, lang }: ApproveButtonProps) {
  const router = useRouter();

  async function handleApprove() {
    const res = await approveAssessment(assessmentId);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.assessments.approved);
      router.refresh();
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>{dict.assessments.approve}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.assessments.approve}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.assessments.approveConfirm}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove}>
            {dict.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
