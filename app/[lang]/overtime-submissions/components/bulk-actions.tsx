'use client';

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
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table } from '@tanstack/react-table';
import { Check, DollarSign, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  bulkApproveOvertimeSubmissions,
  bulkConvertToPayoutOvertimeSubmissions,
  bulkMarkAsAccountedOvertimeSubmissions,
  bulkRejectOvertimeSubmissions,
} from '../actions/bulk';
import { OvertimeSubmissionType } from '../lib/types';
import { Dictionary } from '../lib/dict';

interface BulkActionsProps {
  table: Table<OvertimeSubmissionType>;
  session: Session | null;
  dict: Dictionary;
}

export default function BulkActions({ table, session, dict }: BulkActionsProps) {
  // All hooks at the top
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<
    null | 'approve' | 'reject' | 'settle' | 'convertToPayout'
  >(null);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((row) => row.original._id);
  const selectedCount = selectedRows.length;

  const userRoles = session?.user?.roles || [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');
  const userEmail = session?.user?.email;

  // Check what actions are available based on ALL selected rows
  const allCanApprove =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      return (
        (submission.supervisor === userEmail || isHR || isAdmin) &&
        submission.status === 'pending'
      );
    });
  const allCanReject =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      return (
        (submission.supervisor === userEmail || isHR || isAdmin) &&
        submission.status === 'pending'
      );
    });
  const allCanMarkAsAccounted =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      return (isHR || isAdmin) && submission.status === 'approved';
    });
  const allCanConvertToPayout =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      return (
        (isPlantManager || isAdmin) &&
        submission.status === 'approved' &&
        !submission.payment &&
        !submission.scheduledDayOff
      );
    });

  const hasAnyAction =
    allCanApprove || allCanReject || allCanMarkAsAccounted || allCanConvertToPayout;
  // Always show the card if at least one item is selected
  if (selectedCount === 0) return null;

  // Universal confirm dialog handler
  const handleConfirm = () => {
    if (!pendingActionType) return;
    if (pendingActionType === 'approve') handleBulkApprove();
    if (pendingActionType === 'settle') handleBulkMarkAsAccounted();
    if (pendingActionType === 'convertToPayout') handleBulkConvertToPayout();
    if (pendingActionType === 'reject') setIsRejectDialogOpen(true); // Show reject dialog after confirm
    setPendingActionType(null);
    setIsAlertOpen(false);
  };

  // Instead of confirmAndRun, use this for all actions
  const openConfirmDialog = (
    type: 'approve' | 'reject' | 'settle' | 'convertToPayout',
  ) => {
    setPendingActionType(type);
    setIsAlertOpen(true);
  };

  const handleBulkApprove = async () => {
    toast.promise(
      bulkApproveOvertimeSubmissions(selectedIds).then((res) => {
        if ('success' in res) {
          table.resetRowSelection();
          return res;
        } else {
          throw new Error(res.error || dict.errors.approvalError);
        }
      }),
      {
        loading: dict.toast.bulkApproving,
        success: (res) => dict.toast.bulkApproved.replace('{count}', (res.count || 0).toString()).replace('{total}', (res.total || 0).toString()),
        error: (error) => error.message || dict.errors.approvalError,
      },
    );
  };

  const handleBulkReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(dict.toast.provideRejectionReason);
      return;
    }
    toast.promise(
      bulkRejectOvertimeSubmissions(selectedIds, rejectionReason).then(
        (res) => {
          if ('success' in res) {
            table.resetRowSelection();
            setIsRejectDialogOpen(false);
            setRejectionReason('');
            return res;
          } else {
            throw new Error(res.error || dict.errors.rejectionError);
          }
        },
      ),
      {
        loading: dict.toast.bulkRejecting,
        success: (res) => dict.toast.bulkRejected.replace('{count}', (res.count || 0).toString()).replace('{total}', (res.total || 0).toString()),
        error: (error) => error.message || dict.errors.rejectionError,
      },
    );
  };

  const handleBulkMarkAsAccounted = async () => {
    toast.promise(
      bulkMarkAsAccountedOvertimeSubmissions(selectedIds).then((res) => {
        if ('success' in res) {
          table.resetRowSelection();
          return res;
        } else {
          throw new Error(res.error || dict.errors.settlementError);
        }
      }),
      {
        loading: dict.toast.bulkSettling,
        success: (res) => dict.toast.bulkSettled.replace('{count}', (res.count || 0).toString()).replace('{total}', (res.total || 0).toString()),
        error: (error) => error.message || dict.errors.settlementError,
      },
    );
  };

  const handleBulkConvertToPayout = async () => {
    toast.promise(
      bulkConvertToPayoutOvertimeSubmissions(selectedIds).then((res) => {
        if ('success' in res) {
          table.resetRowSelection();
          return res;
        } else {
          throw new Error(res.error || dict.errors.payoutError);
        }
      }),
      {
        loading: dict.toast.bulkConvertingToPayout,
        success: (res) => dict.toast.bulkConvertedToPayout.replace('{count}', (res.count || 0).toString()).replace('{total}', (res.total || 0).toString()),
        error: (error) => error.message || dict.errors.payoutError,
      },
    );
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.dialogs.bulkConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.dialogs.bulkConfirm.description} {selectedCount}{' '}
              {selectedCount === 1
                ? 'zgłoszeniu'
                : selectedCount % 10 >= 2 &&
                    selectedCount % 10 <= 4 &&
                    ![12, 13, 14].includes(selectedCount % 100)
                  ? 'zgłoszeniach'
                  : 'zgłoszeniach'}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingActionType(null)}>
              {dict.actions.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {dict.actions.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader className='p-4'>
          <CardDescription>
            {(() => {
              if (selectedCount === 1) return dict.bulk.selectedOne;
              if (
                [2, 3, 4].includes(selectedCount % 10) &&
                ![12, 13, 14].includes(selectedCount % 100)
              ) {
                return dict.bulk.selectedFew.replace('{count}', selectedCount.toString());
              }
              return dict.bulk.selectedMany.replace('{count}', selectedCount.toString());
            })()}
            {!hasAnyAction && (
              <>
                <br />
                <span className='text-muted-foreground'>
                  {dict.bulk.noCommonActions}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        {hasAnyAction && (
          <div className='flex flex-wrap gap-2 px-4 pb-4'>
            {allCanApprove && (
              <Button
                variant='default'
                size='sm'
                onClick={() => openConfirmDialog('approve')}
              >
                <Check className='' />
                {dict.bulk.approve}
              </Button>
            )}
            {allCanReject && (
              <Button
                variant='destructive'
                size='sm'
                onClick={() => openConfirmDialog('reject')}
              >
                <X className='' />
                {dict.bulk.reject}
              </Button>
            )}
            {allCanMarkAsAccounted && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => openConfirmDialog('settle')}
              >
                <Check className='' />
                {dict.bulk.settle}
              </Button>
            )}
            {allCanConvertToPayout && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => openConfirmDialog('convertToPayout')}
              >
                <DollarSign className='' />
                {dict.bulk.convertToPayout}
              </Button>
            )}
          </div>
        )}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.bulk.rejectTitle}</DialogTitle>
              <DialogDescription>
                {dict.bulk.rejectDescription.replace('{count}', selectedCount.toString())}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <Textarea
                placeholder={dict.bulk.rejectionReasonPlaceholder}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className='min-h-[100px]'
              />
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                {dict.actions.cancel}
              </Button>
              <Button
                variant='destructive'
                onClick={handleBulkReject}
                disabled={!rejectionReason.trim()}
              >
                <X className='' />
                {dict.bulk.reject}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  );
}
