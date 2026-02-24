'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { CertificationTableRow } from '../../lib/types';
import { deleteCertification } from '../../actions/certifications';
import type { Dictionary } from '../../lib/dict';
import type { Locale } from '@/lib/config/i18n';

interface CertificationActionsProps {
  certification: CertificationTableRow;
  dict: Dictionary;
  lang: Locale;
}

export function CertificationActions({
  certification,
  dict,
  lang,
}: CertificationActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleDelete() {
    const res = await deleteCertification(certification._id);
    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.certifications.deleted);
      router.refresh();
    }
    setDeleteDialogOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link
              href={`/${lang}/competency-matrix/certifications/${certification._id}/edit`}
            >
              {dict.edit}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {dict.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.certifications.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {dict.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
