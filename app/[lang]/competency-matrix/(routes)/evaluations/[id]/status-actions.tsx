'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  submitEvaluation,
  approveEvaluation,
} from '../../../actions/evaluations';
import type { Dictionary } from '../../../lib/dict';

interface EvaluationStatusActionsProps {
  evaluationId: string;
  status: string;
  hasFullAccess: boolean;
  dict: Dictionary;
}

export function EvaluationStatusActions({
  evaluationId,
  status,
  hasFullAccess,
  dict,
}: EvaluationStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!confirm(dict.evaluations.submitConfirm)) return;
    startTransition(async () => {
      const result = await submitEvaluation(evaluationId);
      if ('error' in result) {
        toast.error(dict.errors.serverError);
      } else {
        toast.success(dict.evaluations.submitted);
        router.refresh();
      }
    });
  }

  function handleApprove() {
    if (!confirm(dict.evaluations.approveConfirm)) return;
    startTransition(async () => {
      const result = await approveEvaluation(evaluationId);
      if ('error' in result) {
        toast.error(dict.errors.serverError);
      } else {
        toast.success(dict.evaluations.approved);
        router.refresh();
      }
    });
  }

  return (
    <>
      {status === 'draft' && (
        <Button onClick={handleSubmit} disabled={isPending}>
          {dict.evaluations.submit}
        </Button>
      )}
      {status === 'submitted' && hasFullAccess && (
        <Button onClick={handleApprove} disabled={isPending}>
          {dict.evaluations.approve}
        </Button>
      )}
    </>
  );
}
