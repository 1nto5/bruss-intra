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
import { Check, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  bulkApproveOvertimeSubmissions,
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
    null | 'approve' | 'reject' | 'settle'
  >(null);
  const [bulkQuotaDescription, setBulkQuotaDescription] = useState<string | null>(null);

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
      // Pending submissions: supervisor/HR/admin can approve (including payout requests)
      if (
        submission.status === 'pending' &&
        (submission.supervisor === userEmail || isHR || isAdmin)
      ) {
        return true;
      }
      // Pending-plant-manager: plant manager/admin can approve
      if (
        submission.status === 'pending-plant-manager' &&
        (isPlantManager || isAdmin)
      ) {
        return true;
      }
      return false;
    });
  const allCanReject =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      if (
        submission.status === 'pending' &&
        (submission.supervisor === userEmail || isHR || isAdmin)
      ) {
        return true;
      }
      if (
        submission.status === 'pending-plant-manager' &&
        (isPlantManager || isAdmin)
      ) {
        return true;
      }
      return false;
    });
  const allCanMarkAsAccounted =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const submission = row.original;
      return (isHR || isAdmin) && submission.status === 'approved';
    });

  const hasAnyAction = allCanApprove || allCanReject || allCanMarkAsAccounted;
  // Always show the card if at least one item is selected
  if (selectedCount === 0) return null;

  // Universal confirm dialog handler
  const handleConfirm = () => {
    if (!pendingActionType) return;
    if (pendingActionType === 'approve') handleBulkApprove();
    if (pendingActionType === 'settle') handleBulkMarkAsAccounted();
    if (pendingActionType === 'reject') setIsRejectDialogOpen(true); // Show reject dialog after confirm
    setPendingActionType(null);
    setIsAlertOpen(false);
    setBulkQuotaDescription(null);
  };

  // Polish-style plural: 1 → one, 2-4 (not 12-14) → few, rest → many
  const pluralize = (n: number, one: string, few: string, many: string) => {
    if (n === 1) return one;
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return few;
    return many;
  };

  // Fetch quota and open confirm dialog for approve action
  const openApproveConfirmDialog = async () => {
    const payoutRows = selectedRows.filter((row) => row.original.payoutRequest);

    if (payoutRows.length === 0) {
      // No payout requests — standard confirm
      setPendingActionType('approve');
      setBulkQuotaDescription(null);
      setIsAlertOpen(true);
      return;
    }

    // Fetch supervisor quota for payout-aware dialog
    try {
      const res = await fetch('/api/overtime-submissions/supervisor-quota');
      const quotaData = await res.json();

      if (quotaData.monthlyLimit > 0) {
        // Calculate which items fit within remaining quota
        let remaining = quotaData.remainingHours;
        let directCount = 0;
        let escalateCount = 0;

        for (const row of payoutRows) {
          const hours = Math.abs(row.original.hours);
          if (remaining >= hours) {
            directCount++;
            remaining -= hours;
          } else {
            escalateCount++;
          }
        }

        const parts: string[] = [];

        if (directCount > 0) {
          const tpl = pluralize(
            directCount,
            dict.bulk.approveDirectOne ?? '',
            dict.bulk.approveDirectFew ?? '',
            dict.bulk.approveDirectMany ?? '',
          );
          parts.push(tpl.replace('{count}', String(directCount)));
        }

        if (escalateCount > 0) {
          const tpl = pluralize(
            escalateCount,
            dict.bulk.approveEscalateOne ?? '',
            dict.bulk.approveEscalateFew ?? '',
            dict.bulk.approveEscalateMany ?? '',
          );
          parts.push(tpl.replace('{count}', String(escalateCount)));
        }

        setBulkQuotaDescription(parts.join(' '));
      } else {
        setBulkQuotaDescription(null);
      }
    } catch {
      setBulkQuotaDescription(null);
    }

    setPendingActionType('approve');
    setIsAlertOpen(true);
  };

  // Instead of confirmAndRun, use this for all actions
  const openConfirmDialog = (type: 'approve' | 'reject' | 'settle') => {
    if (type === 'approve') {
      openApproveConfirmDialog();
      return;
    }
    setPendingActionType(type);
    setBulkQuotaDescription(null);
    setIsAlertOpen(true);
  };

  const handleBulkApprove = async () => {
    toast.promise(
      bulkApproveOvertimeSubmissions(selectedIds).then((res) => {
        if ('success' in res) {
          table.resetRowSelection();
          return res;
        } else {
          throw new Error(res.error);
        }
      }),
      {
        loading: dict.toast.bulkApproving,
        success: (res) =>
          dict.toast.bulkApproved
            .replace('{count}', (res.count || 0).toString())
            .replace('{total}', (res.total || 0).toString()),
        error: () => dict.errors.approvalError || dict.errors.contactIT,
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
        success: (res) =>
          dict.toast.bulkRejected
            .replace('{count}', (res.count || 0).toString())
            .replace('{total}', (res.total || 0).toString()),
        error: () => dict.errors.rejectionError || dict.errors.contactIT,
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
        success: (res) =>
          dict.toast.bulkSettled
            .replace('{count}', (res.count || 0).toString())
            .replace('{total}', (res.total || 0).toString()),
        error: () => dict.errors.settlementError || dict.errors.contactIT,
      },
    );
  };

  const getAlertDescription = () => {
    if (bulkQuotaDescription) {
      return bulkQuotaDescription;
    }
    return dict.dialogs.bulkConfirm.description.replace(
      '{count}',
      selectedCount.toString(),
    );
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.dialogs.bulkConfirm.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getAlertDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingActionType(null);
              setBulkQuotaDescription(null);
            }}>
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
                return dict.bulk.selectedFew.replace(
                  '{count}',
                  selectedCount.toString(),
                );
              }
              return dict.bulk.selectedMany.replace(
                '{count}',
                selectedCount.toString(),
              );
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
          {hasAnyAction && (
            <div className='flex flex-wrap gap-2'>
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
            </div>
          )}
        </CardHeader>
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dict.bulk.rejectTitle}</DialogTitle>
              <DialogDescription>
                {dict.bulk.rejectDescription.replace(
                  '{count}',
                  selectedCount.toString(),
                )}
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
