'use client';

import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { endFailure } from '../actions/crud';
import type { Dictionary } from '../../../lib/dict';

export default function EndFailureButton({
  failureId,
  dict,
}: {
  failureId: string;
  dict: Dictionary;
}) {
  const handleOnClick = async () => {
    try {
      const res = await endFailure(failureId);
      if (res.success) {
        toast.success(dict.toasts.failureEnded);
      } else if (res.error) {
        console.error(res.error);
        toast.error(dict.toasts.contactIT);
      }
    } catch (error) {
      console.error('onSubmit', error);
      toast.error(dict.toasts.contactIT);
    }
  };

  return (
    <Button size={'sm'} onClick={handleOnClick}>
      <Wrench />
      {dict.form.end}
    </Button>
  );
}
