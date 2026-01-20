'use client';

import { Button } from '@/components/ui/button';

import {
  DeviationAreaType,
  DeviationReasonType,
  DeviationType,
} from '@/app/[lang]/deviations/lib/types';
import { Dictionary } from '../lib/dict';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import {
  Ban, // Import Ban for cancelled status
  CheckCheck, // Import CheckCheck
  Cog,
  FileDown,
  Hammer,
  History, // Import History icon
  LayoutList, // Import LayoutList
  MailCheck,
  Paperclip, // Import Paperclip
  Printer,
  PrinterCheck, // NEW: Import PrinterIcon
  StickyNote, // Add StickyNote import
  Table as TableIcon,
  Wrench,
} from 'lucide-react';
import { Session } from 'next-auth';
import LocalizedLink from '@/components/localized-link';
import { useState, useTransition } from 'react'; // Import useState
import { toast } from 'sonner';
import { approveDeviation } from '../actions';
import AddAttachmentDialog from './add-attachment-dialog';
import AddNoteDialog from './add-note-dialog'; // Import the new component
import CancelDeviationDialog from './cancel-deviation-dialog';
import EditLogDialog from './edit-log-dialog'; // RENAMED & UNCOMMENTED: Import the dialog component
import PrintLogDialog from './print-log-dialog'; // NEW: Import PrintLogDialog
import TableCellsApprove from './table-cell-approve-role';
import TableCellCorrectiveAction from './table-cell-corrective-action';

// Lista dozwolonych ról do zatwierdzania odchyleń
const APPROVAL_ROLES = [
  'group-leader',
  'quality-manager',
  'production-manager',
  'plant-manager',
] as const;

// NEW: Lista dozwolonych ról do dodawania załączników
const ATTACHMENT_ROLES = [
  'quality',
  'team-leader',
  'group-leader',
  'quality-manager',
  'production-manager',
  'plant-manager',
] as const;

type ApprovalRole = (typeof APPROVAL_ROLES)[number];

export default function DeviationView({
  deviation,
  lang,
  session,
  fetchTime,
  reasonOptions,
  areaOptions,
  dict,
}: {
  deviation: DeviationType | null;
  lang: string;
  session: Session | null;
  fetchTime: Date;
  reasonOptions: DeviationReasonType[];
  areaOptions: DeviationAreaType[];
  dict: Dictionary;
}) {
  const [isPendingApproval, startApprovalTransition] = useTransition();
  const [isPendingPdfExport, startPdfExportTransition] = useTransition();
  const [isEditLogDialogOpen, setIsEditLogDialogOpen] = useState(false); // RENAMED: State for dialog
  const [isPrintLogDialogOpen, setIsPrintLogDialogOpen] = useState(false); // NEW: State for print log dialog

  // Pobieranie wszystkich ról użytkownika, które są uprawnione do zatwierdzania
  const deviationUserRoles =
    session?.user?.roles?.filter((role) => {
      // If user is a plant-manager, only allow plant-manager role for approvals
      if (session?.user?.roles?.includes('plant-manager')) {
        return role === 'plant-manager';
      }
      // Otherwise allow all approval roles
      return APPROVAL_ROLES.includes(role as ApprovalRole);
    }) || [];

  const handleApproval = async (
    approvalRole: string,
    isApproved: boolean = true,
    reason?: string,
  ) => {
    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        startApprovalTransition(async () => {
          try {
            if (!deviation?._id) {
              reject(new Error(dict.view.errors.contactIT));
              return;
            }

            // Check if user has direct role or elevated permission
            const canApproveAsRole = hasElevatedPermission(
              session?.user?.roles || [],
              approvalRole,
            );

            if (deviation?._id && canApproveAsRole) {
              const res = await approveDeviation(
                deviation._id.toString(),
                approvalRole,
                isApproved,
                reason,
              );
              if (res.success) {
                resolve();
              } else if (res.error === 'vacancy_required') {
                // New error type for plant manager trying to approve as non-vacant role
                reject(
                  new Error(dict.view.errors.vacancyRequired),
                );
              } else if (res.error) {
                reject(new Error(dict.view.errors.contactIT));
              }
            } else {
              reject(
                new Error(dict.view.errors.noPermission),
              );
            }
          } catch (error) {
            reject(new Error(dict.view.errors.contactIT));
          }
        });
      }),
      {
        loading: isApproved
          ? dict.view.toasts.approving
          : dict.view.toasts.rejecting,
        success: isApproved ? dict.view.toasts.approved : dict.view.toasts.rejected,
        error: (err) => err.message,
      },
    );
  };

  // Function to check if a user has permission to approve as a specific role
  const hasElevatedPermission = (
    userRoles: string[],
    targetRole: string,
  ): boolean => {
    // If user is a plant-manager, they can approve as any role (vacancy check happens in server action)
    if (userRoles.includes('plant-manager')) {
      return true;
    }

    // Direct role check
    if (userRoles.includes(targetRole)) {
      return true;
    }

    // Elevation check for production-manager
    if (
      userRoles.includes('production-manager') &&
      targetRole === 'group-leader'
    ) {
      return true;
    }

    return false;
  };

  const handleExportToPdf = () => {
    if (!deviation?._id) {
      toast.error(dict.view.errors.noPdfExport);
      return;
    }

    toast.promise(
      new Promise<void>((resolve, reject) => {
        startPdfExportTransition(async () => {
          try {
            const response = await fetch(
              '/api/deviations/deviation/pdf-export',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  deviationId: deviation?._id?.toString(),
                }),
              },
            );

            if (!response.ok) {
              throw new Error(dict.view.errors.pdfGenerationError);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deviation-${deviation?._id?.toString() || 'unknown'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            resolve();
          } catch (error) {
            console.error('Error generating PDF:', error);
            reject(new Error(dict.view.errors.pdfGenerationError));
          }
        });
      }),
      {
        loading: dict.view.toasts.generatingPdf,
        success: dict.view.toasts.pdfGenerated,
        error: (err) => err.message,
      },
    );
  };

  // Check if deviation can be printed (only approved, active or closed)
  const canPrint =
    (deviation?.status === 'approved' ||
      deviation?.status === 'in progress' ||
      deviation?.status === 'closed') &&
    (session?.user?.roles?.some((role: string) =>
      [
        'team-leader',
        'group-leader',
        'quality-manager',
        'production-manager',
        'plant-manager',
      ].includes(role),
    ) ||
      session?.user?.email === deviation?.owner);

  // NEW: Check if user can add attachments
  const canAddAttachment =
    deviation?.status !== 'closed' &&
    (session?.user?.roles?.some((role: string) =>
      ATTACHMENT_ROLES.includes(role as (typeof ATTACHMENT_ROLES)[number]),
    ) ||
      session?.user?.email === deviation?.owner);

  // Check if user can cancel deviation
  const canCancel =
    !['closed', 'cancelled', 'rejected'].includes(deviation?.status || '') &&
    (session?.user?.email === deviation?.owner ||
      (session?.user?.roles?.includes('group-leader') &&
        deviation?.area &&
        session?.user?.roles?.includes(`group-leader-${deviation?.area}`)) ||
      session?.user?.roles?.includes('admin') ||
      session?.user?.roles?.includes('plant-manager'));

  const statusCardTitle = () => {
    switch (deviation?.status) {
      case 'approved':
        return (
          <Badge variant='statusApproved' size='lg' className='text-lg'>
            {dict.view.statusBadges.approved}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant='statusRejected' size='lg' className='text-lg'>
            {dict.view.statusBadges.rejected}
          </Badge>
        );
      case 'in approval':
        return (
          <Badge
            variant='statusPending'
            size='lg'
            className='text-lg text-nowrap'
          >
            {dict.view.statusBadges.inApproval}
          </Badge>
        );
      case 'in progress':
        return (
          <Badge variant='statusInProgress' size='lg' className='text-lg'>
            {dict.view.statusBadges.inProgress}
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant='statusClosed' size='lg' className='text-lg'>
            {dict.view.statusBadges.closed}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant='statusCancelled' size='lg' className='text-lg'>
            {dict.view.statusBadges.cancelled}
          </Badge>
        );
      default:
        return dict.view.statusBadges.deviation;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
          {' '}
          {/* Stack vertically on small, row on sm+ */}
          <CardTitle className='mb-2 sm:mb-0'>
            {statusCardTitle()}
          </CardTitle>{' '}
          {/* Margin bottom only on small screens */}
          <div className='flex flex-wrap justify-start space-x-2 sm:justify-end'>
            {' '}
            {/* Button container */}
            {/* Show PDF export button only for approved, active or closed deviations */}
            {canPrint && (
              <Button
                variant='outline'
                onClick={handleExportToPdf}
                disabled={isPendingPdfExport}
                className='mb-2 sm:mb-0' // Add margin bottom for stacking/wrapping on small screens
              >
                <Printer /> {dict.view.buttons.print}
              </Button>
            )}
            {/* Add Print Log Button */}
            {deviation?.printLogs && deviation.printLogs.length > 0 && (
              <Button
                variant='outline'
                onClick={() => setIsPrintLogDialogOpen(true)}
                className='mb-2 sm:mb-0'
              >
                <PrinterCheck /> {dict.view.buttons.printLog}
              </Button>
            )}
            {/* Cancel Deviation Button */}
            {deviation?._id && canCancel && (
              <CancelDeviationDialog
                deviationId={deviation._id.toString()}
                dict={dict}
              />
            )}
            <LocalizedLink href='/deviations'>
              <Button variant='outline' className='mb-2 sm:mb-0'>
                {' '}
                {/* Add margin bottom */}
                <TableIcon /> {dict.view.buttons.backToTable}
              </Button>
            </LocalizedLink>
            {/* REMOVED: Edit button from here - moved to Details card */}
          </div>
        </div>
        <CardDescription>ID: {deviation?.internalId}</CardDescription>
      </CardHeader>
      <Separator className='mb-4' />
      <CardContent>
        <div className='flex-col space-y-4'>
          <div className='space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4'>
            <Card className='lg:w-5/12'>
              <CardHeader>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
                  <CardTitle className='mb-2 flex items-center sm:mb-0'>
                    <LayoutList className='mr-2 h-5 w-5' /> {dict.view.sections.details}
                  </CardTitle>
                  <div className='flex flex-wrap gap-2'>
                    {/* Edit History Button */}
                    {deviation?.editLogs && deviation.editLogs.length > 0 && (
                      <Button
                        variant='outline'
                        onClick={() => setIsEditLogDialogOpen(true)}
                      >
                        <History /> {dict.view.buttons.editLog}
                      </Button>
                    )}
                    {/* MOVED: Edit button to here */}
                    {['in approval', 'rejected'].includes(
                      deviation?.status || '',
                    ) &&
                      (session?.user?.email === deviation?.owner ||
                        session?.user?.roles?.some((role: string) =>
                          [
                            'admin',
                            'group-leader',
                            'production-manager',
                            'quality-manager',
                            'plant-manager',
                          ].includes(role),
                        )) && (
                        <LocalizedLink href={`/deviations/${deviation?._id}/edit`}>
                          <Button variant='outline'>
                            <Cog /> {dict.view.buttons.edit}
                          </Button>
                        </LocalizedLink>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {/* Cancellation info when status is cancelled */}
                    {deviation?.status === 'cancelled' && deviation?.cancellation && (
                      <>
                        <TableRow className='bg-destructive/10'>
                          <TableCell className='font-medium'>
                            {dict.view.cancellationInfo.cancelledBy}:
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(deviation.cancellation.by)}
                          </TableCell>
                        </TableRow>
                        <TableRow className='bg-destructive/10'>
                          <TableCell className='font-medium'>
                            {dict.view.cancellationInfo.cancelledAt}:
                          </TableCell>
                          <TableCell>
                            {formatDateTime(deviation.cancellation.at)}
                          </TableCell>
                        </TableRow>
                        {deviation.cancellation.reason && (
                          <TableRow className='bg-destructive/10'>
                            <TableCell className='font-medium'>
                              {dict.view.cancellationInfo.reason}:
                            </TableCell>
                            <TableCell className='whitespace-pre-line'>
                              {deviation.cancellation.reason}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.created}:</TableCell>
                      <TableCell>
                        {deviation?.createdAt
                          ? formatDateTime(deviation.createdAt)
                          : '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.owner}:</TableCell>
                      <TableCell>
                        {extractNameFromEmail(deviation?.owner || '') || '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.view.labels.articleNumber}:
                      </TableCell>
                      <TableCell>{deviation?.articleNumber || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.view.labels.articleName}:
                      </TableCell>
                      <TableCell>{deviation?.articleName || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.view.labels.customerNumber}:
                      </TableCell>
                      <TableCell>{deviation?.customerNumber || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.view.labels.customerName}:
                      </TableCell>
                      <TableCell>{deviation?.customerName || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.workplace}:</TableCell>
                      <TableCell>{deviation?.workplace || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.quantity}:</TableCell>
                      <TableCell>
                        {`${deviation?.quantity?.value || '-'} ${deviation?.quantity?.unit === 'pcs' ? dict.table.units.pcs : deviation?.quantity?.unit || ''}`}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.charge}:</TableCell>
                      <TableCell>{deviation?.charge || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.reason}:</TableCell>
                      <TableCell>
                        {deviation?.reason
                          ? reasonOptions.find(
                              (option) => option.value === deviation.reason,
                            )
                            ? lang === 'pl'
                              ? reasonOptions.find(
                                  (option) => option.value === deviation.reason,
                                )?.pl
                              : reasonOptions.find(
                                  (option) => option.value === deviation.reason,
                                )?.label
                            : deviation.reason
                          : '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.validPeriod}:</TableCell>
                      <TableCell>
                        {deviation?.timePeriod?.from &&
                        deviation?.timePeriod?.to
                          ? `${formatDate(deviation?.timePeriod?.from)} - ${formatDate(deviation?.timePeriod?.to)}`
                          : '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.view.labels.area}:</TableCell>
                      <TableCell>
                        {deviation?.area
                          ? areaOptions.find(
                              (option) => option.value === deviation.area,
                            )
                            ? lang === 'pl'
                              ? areaOptions.find(
                                  (option) => option.value === deviation.area,
                                )?.pl
                              : areaOptions.find(
                                  (option) => option.value === deviation.area,
                                )?.label
                            : deviation.area
                          : '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>{dict.view.labels.description}:</TableCell>
                      <TableCell>{deviation?.description || '-'}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>{dict.view.labels.processSpecification}:</TableCell>
                      <TableCell>
                        {deviation?.processSpecification || '-'}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>{dict.view.labels.customerAuthorization}:</TableCell>
                      <TableCell>
                        {deviation?.customerAuthorization ? dict.view.labels.yes : dict.view.labels.no}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className='flex-col space-y-4 lg:w-7/12'>
              <Card>
                <CardHeader>
                  <div className='flex justify-between'>
                    <CardTitle className='flex items-center'>
                      <Wrench className='mr-2 h-5 w-5' /> {dict.view.sections.correctiveActions}
                    </CardTitle>
                    {(session?.user?.roles?.some((role: string) =>
                      [
                        'quality',
                        'team-leader',
                        'group-leader',
                        'quality-manager',
                        'production-manager',
                        'plant-manager',
                      ].includes(role),
                    ) ||
                      session?.user?.email === deviation?.owner) && (
                      <LocalizedLink
                        href={`/deviations/${deviation?._id}/corrective/add`}
                      >
                        <Button variant='outline'>
                          <Hammer /> {dict.view.buttons.addCorrectiveAction}
                        </Button>
                      </LocalizedLink>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.view.correctiveActionsTable.status}</TableHead>
                        <TableHead>{dict.view.correctiveActionsTable.changeStatus}</TableHead>
                        <TableHead className='min-w-[250px]'>{dict.view.correctiveActionsTable.description}</TableHead>
                        <TableHead>{dict.view.correctiveActionsTable.assignee}</TableHead>
                        <TableHead>{dict.view.correctiveActionsTable.deadline}</TableHead>
                        <TableHead>{dict.view.correctiveActionsTable.lastChange}</TableHead>
                        <TableHead>{dict.view.correctiveActionsTable.history}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviation?.correctiveActions &&
                      deviation.correctiveActions.length > 0 ? (
                        deviation.correctiveActions.map(
                          (correctiveAction, index) => (
                            <TableRow key={index}>
                              <TableCellCorrectiveAction
                                correctiveAction={correctiveAction}
                                correctiveActionIndex={index}
                                deviationId={deviation?._id?.toString() || ''}
                                lang={lang}
                                user={session?.user?.email}
                                userRoles={session?.user?.roles}
                                deviationOwner={deviation?.owner}
                                dict={dict}
                              />
                            </TableRow>
                          ),
                        )
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className='text-muted-foreground text-center'
                          >
                            {dict.view.correctiveActionsTable.noActions}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <CheckCheck className='mr-2 h-5 w-5' /> {dict.view.sections.approvals}
                  </CardTitle>
                  <CardDescription>
                    {!session && (
                      <span>
                        {dict.view.approvalsCard.loginMessage}{' '}
                        <LocalizedLink
                          href={`/auth?callbackUrl=${encodeURIComponent(`/${lang}/deviations/${deviation?._id}`)}`}
                          className='text-blue-600 underline hover:text-blue-800'
                        >
                          {dict.view.approvalsCard.loginLink}
                        </LocalizedLink>
                        .
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.view.approvalsTable.status}</TableHead>
                        <TableHead>{dict.view.approvalsTable.role}</TableHead>
                        <TableHead>{dict.view.approvalsTable.approve}</TableHead>
                        <TableHead>{dict.view.approvalsTable.person}</TableHead>
                        <TableHead>{dict.view.approvalsTable.date}</TableHead>
                        <TableHead>{dict.view.approvalsTable.comment}</TableHead>
                        <TableHead>{dict.view.approvalsTable.history}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCellsApprove
                          roleText='Group Leader'
                          deviationUserRoles={deviationUserRoles}
                          role='group-leader'
                          approved={deviation?.groupLeaderApproval?.approved}
                          handleApproval={(isApproved, reason) =>
                            handleApproval('group-leader', isApproved, reason)
                          }
                          by={deviation?.groupLeaderApproval?.by}
                          at={deviation?.groupLeaderApproval?.at?.toString()}
                          lang={lang}
                          reason={deviation?.groupLeaderApproval?.reason}
                          history={deviation?.groupLeaderApproval?.history}
                          deviationStatus={deviation?.status}
                          dict={dict}
                        />
                      </TableRow>
                      <TableRow>
                        <TableCellsApprove
                          roleText={dict.view.roles.qualityManager}
                          deviationUserRoles={deviationUserRoles}
                          role='quality-manager'
                          approved={deviation?.qualityManagerApproval?.approved}
                          handleApproval={(isApproved, reason) =>
                            handleApproval(
                              'quality-manager',
                              isApproved,
                              reason,
                            )
                          }
                          by={deviation?.qualityManagerApproval?.by}
                          at={deviation?.qualityManagerApproval?.at?.toString()}
                          lang={lang}
                          reason={deviation?.qualityManagerApproval?.reason}
                          history={deviation?.qualityManagerApproval?.history}
                          deviationStatus={deviation?.status}
                          dict={dict}
                        />
                      </TableRow>

                      <TableRow>
                        <TableCellsApprove
                          roleText={dict.view.roles.productionManager}
                          deviationUserRoles={deviationUserRoles}
                          role='production-manager'
                          approved={
                            deviation?.productionManagerApproval?.approved
                          }
                          handleApproval={(isApproved, reason) =>
                            handleApproval(
                              'production-manager',
                              isApproved,
                              reason,
                            )
                          }
                          by={deviation?.productionManagerApproval?.by}
                          at={deviation?.productionManagerApproval?.at?.toString()}
                          lang={lang}
                          reason={deviation?.productionManagerApproval?.reason}
                          history={
                            deviation?.productionManagerApproval?.history
                          }
                          deviationStatus={deviation?.status}
                          dict={dict}
                        />
                      </TableRow>
                      <TableRow>
                        <TableCellsApprove
                          roleText={dict.view.roles.plantManager}
                          deviationUserRoles={deviationUserRoles}
                          role='plant-manager'
                          approved={deviation?.plantManagerApproval?.approved}
                          handleApproval={(isApproved, reason) =>
                            handleApproval('plant-manager', isApproved, reason)
                          }
                          by={deviation?.plantManagerApproval?.by}
                          at={deviation?.plantManagerApproval?.at?.toString()}
                          lang={lang}
                          reason={deviation?.plantManagerApproval?.reason}
                          history={deviation?.plantManagerApproval?.history}
                          deviationStatus={deviation?.status}
                          dict={dict}
                        />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <MailCheck className='mr-2 h-5 w-5' /> {dict.view.sections.notifications}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className='h-60'>
                    {' '}
                    {/* Add ScrollArea with height */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{dict.view.notificationsTable.to}</TableHead>
                          <TableHead>{dict.view.notificationsTable.sentAt}</TableHead>
                          <TableHead>{dict.view.notificationsTable.type}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deviation?.notificationLogs &&
                        deviation.notificationLogs.length > 0 ? (
                          [...deviation.notificationLogs] // Create a shallow copy to avoid mutating the original array
                            .sort(
                              (a, b) =>
                                new Date(b.sentAt).getTime() -
                                new Date(a.sentAt).getTime(),
                            ) // Sort by date descending
                            // .slice(0, 10) // Remove slice to show all logs
                            .map((log, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {extractNameFromEmail(log.to)}
                                </TableCell>
                                <TableCell>
                                  {formatDateTime(log.sentAt)}
                                </TableCell>
                                <TableCell>{log.type}</TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className='text-muted-foreground text-center'
                            >
                              {dict.view.notificationsTable.noNotifications}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>{' '}
                  {/* Close ScrollArea */}
                </CardContent>
              </Card>
            </div>
          </div>
          <div>
            <Card>
              <CardHeader>
                <div className='flex justify-between'>
                  <CardTitle className='flex items-center'>
                    <Paperclip className='mr-2 h-5 w-5' /> {dict.view.sections.attachments}
                  </CardTitle>
                  {deviation?._id &&
                    canAddAttachment && ( // Use the new check here
                      <AddAttachmentDialog
                        deviationId={deviation._id.toString()}
                        deviationStatus={deviation.status} // Pass status
                        deviationOwner={deviation.owner} // Pass owner
                        session={session} // Pass session
                        dict={dict}
                      />
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.view.attachmentsTable.name}</TableHead>
                      <TableHead>{dict.view.attachmentsTable.file}</TableHead>
                      <TableHead>{dict.view.attachmentsTable.note}</TableHead>
                      <TableHead>{dict.view.attachmentsTable.uploadedBy}</TableHead>
                      <TableHead>{dict.view.attachmentsTable.date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviation?.attachments &&
                    deviation.attachments.length > 0 ? (
                      [...deviation.attachments]
                        .sort(
                          (a, b) =>
                            new Date(b.uploadedAt).getTime() -
                            new Date(a.uploadedAt).getTime(),
                        )
                        .map((attachment, index) => (
                          <TableRow key={index}>
                            <TableCell>{attachment.name}</TableCell>
                            <TableCell>
                              <a
                                href={`/api/deviations/download?deviationId=${deviation._id?.toString()}&filename=${encodeURIComponent(attachment.filename)}`}
                                download={attachment.filename}
                                target='_blank'
                                rel='noopener noreferrer'
                              >
                                <Button variant='outline' size='icon'>
                                  <FileDown />
                                </Button>
                              </a>
                            </TableCell>
                            <TableCell className='max-w-[150px] truncate'>
                              {attachment.note || '-'}
                            </TableCell>
                            <TableCell className='whitespace-nowrap'>
                              {extractNameFromEmail(attachment.uploadedBy)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(attachment.uploadedAt)}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='text-muted-foreground text-center'
                        >
                          {dict.view.attachmentsTable.noAttachments}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Add new card for notes */}
          <div>
            <Card>
              <CardHeader>
                <div className='flex justify-between'>
                  <CardTitle className='flex items-center'>
                    <StickyNote className='mr-2 h-5 w-5' /> {dict.view.sections.notes}
                  </CardTitle>
                  {deviation?._id && session && (
                    <AddNoteDialog deviationId={deviation._id.toString()} dict={dict} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.view.notesTable.person}</TableHead>
                      <TableHead>{dict.view.notesTable.date}</TableHead>
                      <TableHead>{dict.view.notesTable.note}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviation?.notes && deviation.notes.length > 0 ? (
                      [...deviation.notes]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((note, index) => (
                          <TableRow key={index}>
                            <TableCell className='whitespace-nowrap'>
                              {extractNameFromEmail(note.createdBy)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(note.createdAt)}
                            </TableCell>
                            <TableCell className='whitespace-pre-line'>
                              {note.content}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className='text-muted-foreground text-center'
                        >
                          {dict.view.notesTable.noNotes}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
      {/* Render the Edit Log Dialog (conditionally) */}

      <EditLogDialog // RENAMED & UNCOMMENTED: Component
        isOpen={isEditLogDialogOpen} // RENAMED: State variable
        onClose={() => setIsEditLogDialogOpen(false)} // RENAMED: Setter
        logs={deviation?.editLogs || []} // RENAMED: Prop name and source
        dict={dict}
      />

      {/* NEW: Print Log Dialog */}
      <PrintLogDialog
        isOpen={isPrintLogDialogOpen}
        onClose={() => setIsPrintLogDialogOpen(false)}
        logs={deviation?.printLogs || []}
        dict={dict}
      />
    </Card>
  );
}
