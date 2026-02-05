'use client';

import { Button } from '@/components/ui/button';
import { Locale } from '@/lib/config/i18n';
import { Calendar, Check, Trash2, X } from 'lucide-react';
import { Session } from 'next-auth';
import { useEffect, useState } from 'react';
import { Dictionary } from '../lib/dict';
import { IndividualOvertimeOrderType } from '../lib/types';
import ApproveOrderDialog from './approve-order-dialog';
import DeleteOrderDialog from './delete-order-dialog';
import MarkAsAccountedDialog from './mark-as-accounted-dialog';
import RejectOrderDialog from './reject-order-dialog';
import ScheduleDayoffDialog from './schedule-dayoff-dialog';

interface SupervisorQuotaInfo {
  canGiveFinalApproval: boolean;
  monthlyLimit: number;
  usedHours: number;
  remainingHours: number;
  orderHours: number;
}

interface DetailActionsProps {
  order: IndividualOvertimeOrderType;
  session: Session;
  dict: Dictionary;
  lang: Locale;
}

export default function DetailActions({
  order,
  session,
  dict,
  lang,
}: DetailActionsProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [markAsAccountedDialogOpen, setMarkAsAccountedDialogOpen] =
    useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleDayoffDialogOpen, setScheduleDayoffDialogOpen] =
    useState(false);
  const [quotaInfo, setQuotaInfo] = useState<SupervisorQuotaInfo | null>(null);

  const userEmail = session.user?.email;
  const userRoles = session.user?.roles ?? [];
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');
  const isPlantManager = userRoles.includes('plant-manager');
  const isManager = userRoles.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  const isSupervisor = order.supervisor === userEmail;
  const isOrderCreator = order.createdBy === userEmail;

  // Fetch supervisor quota info for pending payout orders
  useEffect(() => {
    if (order.status === 'pending' && order.payment) {
      fetch(`/api/individual-overtime-orders/supervisor-quota?orderId=${order._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setQuotaInfo(data);
          }
        })
        .catch(console.error);
    }
  }, [order._id, order.status, order.payment]);

  // Determine what actions are available based on status and role
  const canApproveSupervisor =
    order.status === 'pending' &&
    (isSupervisor || isHR || isAdmin);

  const canApprovePlantManager =
    order.status === 'pending-plant-manager' &&
    (isPlantManager || isAdmin);

  const canApprove = canApproveSupervisor || canApprovePlantManager;

  const canReject =
    (order.status === 'pending' || order.status === 'pending-plant-manager') &&
    (isSupervisor || isPlantManager || isHR || isAdmin);

  const canMarkAsAccounted =
    order.status === 'approved' && (isHR || isAdmin);

  const canScheduleDayoff = false;

  const canDelete = isAdmin;

  const getApproveButtonText = () => {
    if (order.status === 'pending-plant-manager') {
      return dict.actions.approvePlantManager;
    }
    if (quotaInfo?.canGiveFinalApproval) {
      return dict.actions.approvePayment ?? 'Approve Payment';
    }
    return dict.actions.approve;
  };

  return (
    <div className='flex flex-wrap gap-2'>
      {canApprove && (
        <Button
          variant='default'
          size='sm'
          onClick={() => setApproveDialogOpen(true)}
        >
          <Check className='mr-1 h-4 w-4' />
          {getApproveButtonText()}
        </Button>
      )}

      {canReject && (
        <Button
          variant='destructive'
          size='sm'
          onClick={() => setRejectDialogOpen(true)}
        >
          <X className='mr-1 h-4 w-4' />
          {dict.actions.reject}
        </Button>
      )}

      {canScheduleDayoff && (
        <Button
          variant='secondary'
          size='sm'
          onClick={() => setScheduleDayoffDialogOpen(true)}
        >
          <Calendar className='mr-1 h-4 w-4' />
          {dict.actions.scheduleDayOff}
        </Button>
      )}

      {canMarkAsAccounted && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => setMarkAsAccountedDialogOpen(true)}
        >
          <Check className='mr-1 h-4 w-4' />
          {dict.actions.markAsAccounted}
        </Button>
      )}

      {canDelete && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => setDeleteDialogOpen(true)}
          className='text-destructive'
        >
          <Trash2 className='mr-1 h-4 w-4' />
          {dict.actions.delete}
        </Button>
      )}

      <ApproveOrderDialog
        isOpen={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        orderId={order._id}
        dict={dict}
        isFinalApproval={quotaInfo?.canGiveFinalApproval}
        orderHours={quotaInfo?.orderHours}
        remainingQuota={quotaInfo?.remainingHours}
      />

      <RejectOrderDialog
        isOpen={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        orderId={order._id}
        dict={dict}
      />

      <MarkAsAccountedDialog
        isOpen={markAsAccountedDialogOpen}
        onOpenChange={setMarkAsAccountedDialogOpen}
        orderId={order._id}
        dict={dict}
      />

      <DeleteOrderDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        orderId={order._id}
        dict={dict}
        lang={lang}
      />

      <ScheduleDayoffDialog
        isOpen={scheduleDayoffDialogOpen}
        onOpenChange={setScheduleDayoffDialogOpen}
        orderId={order._id}
        dict={dict}
      />
    </div>
  );
}
