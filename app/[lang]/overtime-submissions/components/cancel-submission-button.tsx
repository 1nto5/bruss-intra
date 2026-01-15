'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Dictionary } from '../lib/dict';
import CancelSubmissionDialog from './cancel-submission-dialog';

type CancelSubmissionButtonProps = {
  submissionId: string;
  dict: Dictionary;
};

export default function CancelSubmissionButton({
  submissionId,
  dict,
}: CancelSubmissionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant='outline'
        className='text-destructive hover:text-destructive'
        onClick={() => setIsDialogOpen(true)}
      >
        <X /> {dict.actions?.cancelSubmission || 'Cancel'}
      </Button>
      <CancelSubmissionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        submissionId={submissionId}
        dict={dict}
      />
    </>
  );
}
