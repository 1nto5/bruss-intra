import LocalizedLink from '@/components/localized-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { Locale } from '@/lib/config/i18n';
import { checkIfUserIsSupervisor } from '@/lib/data/check-user-supervisor-status';
import { dbc } from '@/lib/db/mongo';
import { formatDate, formatDateTime, formatTime } from '@/lib/utils/date-format';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import {
  Banknote,
  CalendarCheck,
  Clock,
  Edit2,
  FileText,
  Mail,
  MailX,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { ObjectId } from 'mongodb';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CancelOrderButton from '../../components/cancel-order-button';
import DetailActions from '../../components/detail-actions';
import type { Dictionary } from '../../lib/dict';
import { getDictionary } from '../../lib/dict';

export const dynamic = 'force-dynamic';

function getStatusBadge(status: string, dict: Dictionary) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant='statusPending' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.pending}
        </Badge>
      );
    case 'pending-plant-manager':
      return (
        <Badge
          variant='statusPending'
          size='lg'
          className='bg-yellow-400 text-lg text-black'
        >
          {dict.detailsPage.statusLabels.pendingPlantManager}
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant='statusApproved' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.approved}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant='statusRejected' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.rejected}
        </Badge>
      );
    case 'accounted':
      return (
        <Badge variant='statusAccounted' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.accounted}
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant='statusCancelled' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.cancelled}
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' size='lg' className='text-lg'>
          {status}
        </Badge>
      );
  }
}

function getTypeBadge(
  payment: boolean,
  scheduledDayOff: Date | undefined,
  dict: Dictionary,
) {
  if (payment) {
    return (
      <Badge variant='typePayout' className='gap-1.5'>
        <Banknote className='h-3 w-3' />
        {dict.columns.typePayout}
      </Badge>
    );
  }
  if (scheduledDayOff) {
    return (
      <Badge variant='typeDayOff' className='gap-1.5'>
        <CalendarCheck className='h-3 w-3' />
        {dict.columns.typeDayOff}: {formatDate(scheduledDayOff)}
      </Badge>
    );
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const order = await getOrder(id);

  if (!order) {
    return {
      title: `${dict.detailsPage.title} (BRUSS)`,
    };
  }

  return {
    title: `${dict.detailsPage.title} - ${order.internalId || id} (BRUSS)`,
  };
}

async function getOrder(id: string) {
  try {
    const coll = await dbc('individual_overtime_orders');
    const order = await coll.findOne({ _id: new ObjectId(id) });
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

async function getEmployeeName(
  identifier: string,
): Promise<{ name: string; hasEmail: boolean } | null> {
  try {
    const employeesColl = await dbc('employees');
    const employee = await employeesColl.findOne(
      { identifier },
      { projection: { firstName: 1, lastName: 1, email: 1 } },
    );
    if (employee?.firstName && employee?.lastName) {
      return {
        name: `${employee.firstName} ${employee.lastName}`,
        hasEmail: !!employee.email,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
}

export default async function OrderDetailsPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;
  const searchParams = await props.searchParams;

  const dict = await getDictionary(lang);

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect(
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/individual-overtime-orders/${id}`)}`,
    );
  }

  // Check access: role-based or supervisor-based
  const userRolesForAccess = session.user?.roles ?? [];
  const isAdminForAccess = userRolesForAccess.includes('admin');
  const isHRForAccess = userRolesForAccess.includes('hr');
  const isPlantManagerForAccess = userRolesForAccess.includes('plant-manager');
  const isManagerForAccess = userRolesForAccess.some(
    (role: string) =>
      role.toLowerCase().includes('manager') ||
      role.toLowerCase().includes('group-leader'),
  );

  let hasAccess =
    isManagerForAccess ||
    isHRForAccess ||
    isAdminForAccess ||
    isPlantManagerForAccess;
  if (!hasAccess && session.user?.email) {
    hasAccess = await checkIfUserIsSupervisor(session.user.email);
  }
  if (!hasAccess) {
    redirect(`/${lang}/individual-overtime-orders`);
  }

  const order = await getOrder(id);

  if (!order) {
    redirect(`/${lang}/individual-overtime-orders`);
  }

  // Get employee info if order has employeeIdentifier
  const employeeInfo = order.employeeIdentifier
    ? await getEmployeeName(order.employeeIdentifier)
    : null;

  // Use returnUrl from searchParams if available, otherwise default to list
  const backUrl = searchParams.returnUrl
    ? decodeURIComponent(searchParams.returnUrl)
    : '/individual-overtime-orders';

  // Check if user can correct this order
  const userEmail = session.user.email ?? '';
  const userRoles = session.user.roles ?? [];
  const isAuthor = order.submittedBy === userEmail;
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  // Correction permissions:
  // - Author: only when status is pending
  // - HR: when status is pending or approved
  // - Admin: all statuses except accounted
  const canCorrect =
    (isAuthor && order.status === 'pending') ||
    (isHR && ['pending', 'approved'].includes(order.status)) ||
    (isAdmin && order.status !== 'accounted');

  // Can cancel when status is pending or pending-plant-manager
  const canCancel =
    isAuthor &&
    (order.status === 'pending' || order.status === 'pending-plant-manager');

  // Build correction URL with returnUrl for back navigation chain
  const correctionReturnUrl = searchParams.returnUrl
    ? `&returnUrl=${searchParams.returnUrl}`
    : '';
  const correctionUrl = `/individual-overtime-orders/correct/${id}?from=details${correctionReturnUrl}`;

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='mb-2 sm:mb-0'>
            {getStatusBadge(order.status, dict)}
          </CardTitle>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {/* Cancel order button */}
            {canCancel && <CancelOrderButton orderId={id} dict={dict} />}
            {/* Admin actions (Approve, Reject, Mark Accounted, Schedule Day Off) */}
            <DetailActions
              order={
                {
                  ...order,
                  _id: order._id.toString(),
                } as any
              }
              session={session}
              dict={dict}
              lang={lang}
            />
            {/* Correction button */}
            {canCorrect && (
              <LocalizedLink href={correctionUrl} className='w-full sm:w-auto'>
                <Button variant='outline' className='w-full'>
                  <Edit2 /> {dict.actions.correct}
                </Button>
              </LocalizedLink>
            )}
            {/* Back to orders button */}
            <LocalizedLink href={backUrl} className='w-full sm:w-auto'>
              <Button variant='outline' className='w-full'>
                <TableIcon /> {dict.detailsPage.backToOrders}
              </Button>
            </LocalizedLink>
          </div>
        </div>
        {order.internalId && (
          <CardDescription>ID: {order.internalId}</CardDescription>
        )}
      </CardHeader>
      <Separator className='mb-4' />

      <CardContent>
        <div className='flex-col space-y-4'>
          <div className='space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4'>
            {/* Left Column - Order Details */}
            <Card className='lg:w-5/12'>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FileText className='mr-2 h-5 w-5' />{' '}
                  {dict.detailsPage.orderDetails}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.submittedBy}
                      </TableCell>
                      <TableCell>
                        {extractNameFromEmail(order.submittedBy)}
                      </TableCell>
                    </TableRow>

                    {/* Show createdBy when order was created on behalf of someone */}
                    {order.createdBy &&
                      order.createdBy !== order.submittedBy && (
                        <TableRow>
                          <TableCell className='font-medium'>
                            {dict.form.createdBy}
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(order.createdBy)}
                          </TableCell>
                        </TableRow>
                      )}

                    {/* Show employee info for individual orders */}
                    {employeeInfo && (
                      <TableRow>
                        <TableCell className='font-medium'>
                          {dict.form.employee}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1.5'>
                            <span>{employeeInfo.name}</span>
                            {order.emailNotificationSent === true ? (
                              <span title={dict.columns?.emailSent || 'Email notification sent'}>
                                <Mail className='h-3.5 w-3.5 text-green-600' />
                              </span>
                            ) : (
                              <span title={dict.columns?.noEmail || 'No email'}>
                                <MailX className='h-3.5 w-3.5 text-muted-foreground' />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.supervisor}
                      </TableCell>
                      <TableCell>
                        {extractNameFromEmail(order.supervisor)}
                      </TableCell>
                    </TableRow>

                    {/* Show time range */}
                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.workStartTime}
                      </TableCell>
                      <TableCell>
                        {formatDate(order.workStartTime)}{' '}
                        {formatTime(order.workStartTime, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.workEndTime}
                      </TableCell>
                      <TableCell>
                        {formatDate(order.workEndTime)}{' '}
                        {formatTime(order.workEndTime, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.hours}
                      </TableCell>
                      <TableCell>{order.hours}h</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.columns.type}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(order.payment, order.scheduledDayOff, dict)}
                      </TableCell>
                    </TableRow>

                    {/* Show reason if it exists */}
                    {order.reason && (
                      <TableRow>
                        <TableCell className='align-top font-medium'>
                          {dict.detailsPage.reason}
                        </TableCell>
                        <TableCell className='whitespace-pre-wrap'>
                          {order.reason}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right Column - History */}
            <div className='flex-col space-y-4 lg:w-7/12'>
              {/* Status History Card */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <Clock className='mr-2 h-5 w-5' />{' '}
                    {dict.detailsPage.history}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.detailsPage.statusColumn}</TableHead>
                        <TableHead>{dict.detailsPage.person}</TableHead>
                        <TableHead>{dict.detailsPage.dateTime}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Cancelled */}
                      {order.cancelledAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusCancelled'>
                              {dict.detailsPage.statusLabels.cancelled}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(order.cancelledBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.cancelledAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Accounted */}
                      {order.accountedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusAccounted'>
                              {dict.detailsPage.statusLabels.accounted}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(order.accountedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.accountedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Plant Manager Approved */}
                      {order.plantManagerApprovedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusApproved'>
                              {dict.detailsPage.statusLabels.plantManagerApproved}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(
                              order.plantManagerApprovedBy || '',
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.plantManagerApprovedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Supervisor Approved */}
                      {order.supervisorApprovedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusApproved'>
                              {dict.detailsPage.statusLabels.supervisorApproved}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(
                              order.supervisorApprovedBy || '',
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.supervisorApprovedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Approved (final) */}
                      {order.approvedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusApproved'>
                              {dict.detailsPage.statusLabels.approved}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(order.approvedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.approvedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Rejected */}
                      {order.rejectedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusRejected'>
                              {dict.detailsPage.statusLabels.rejected}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(order.rejectedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(order.rejectedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Edited */}
                      {order.editedAt &&
                        order.editedAt.getTime() !==
                          order.submittedAt.getTime() && (
                          <TableRow>
                            <TableCell>
                              <Badge variant='outline'>
                                {dict.detailsPage.statusLabels.edited}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {extractNameFromEmail(order.editedBy || '')}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(order.editedAt)}
                            </TableCell>
                          </TableRow>
                        )}

                      {/* Created */}
                      <TableRow>
                        <TableCell>
                          <Badge variant='outline'>
                            {dict.detailsPage.statusLabels.created}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {extractNameFromEmail(order.submittedBy)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(order.submittedAt)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Cancellation Reason Card */}
              {order.cancellationReason && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-destructive flex items-center'>
                      <X className='mr-2 h-5 w-5' />{' '}
                      {dict.detailsPage.cancellationReason}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='max-w-[400px] text-justify break-words'>
                      {order.cancellationReason}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Rejection Details Card */}
              {order.rejectionReason && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-destructive flex items-center'>
                      <X className='mr-2 h-5 w-5' />{' '}
                      {dict.detailsPage.rejectionDetails}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className='font-medium'>
                            {dict.detailsPage.rejectionReason}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className='max-w-[400px] text-justify break-words'>
                            {order.rejectionReason}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Corrections History Card */}
              {order.correctionHistory && order.correctionHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center'>
                      <Edit2 className='mr-2 h-5 w-5' />{' '}
                      {dict.detailsPage.corrections}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{dict.detailsPage.dateTime}</TableHead>
                          <TableHead>{dict.detailsPage.person}</TableHead>
                          <TableHead>
                            {dict.detailsPage.correctionReason}
                          </TableHead>
                          <TableHead>{dict.detailsPage.changes}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...order.correctionHistory]
                          .reverse()
                          .map((correction: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className='whitespace-nowrap'>
                                {formatDateTime(correction.correctedAt)}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>
                                {extractNameFromEmail(correction.correctedBy)}
                              </TableCell>
                              <TableCell className='max-w-[200px]'>
                                {correction.reason}
                              </TableCell>
                              <TableCell>
                                <div className='space-y-1 text-sm'>
                                  {correction.statusChanged && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.detailsPage.statusChange}:
                                      </span>{' '}
                                      {correction.statusChanged.from} →{' '}
                                      {correction.statusChanged.to}
                                    </div>
                                  )}
                                  {correction.changes.supervisor && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.supervisor}:
                                      </span>{' '}
                                      {extractNameFromEmail(
                                        correction.changes.supervisor.from,
                                      )}{' '}
                                      →{' '}
                                      {extractNameFromEmail(
                                        correction.changes.supervisor.to,
                                      )}
                                    </div>
                                  )}
                                  {correction.changes.hours !== undefined && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.hours}:
                                      </span>{' '}
                                      {correction.changes.hours.from}h →{' '}
                                      {correction.changes.hours.to}h
                                    </div>
                                  )}
                                  {correction.changes.reason && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.reason}:
                                      </span>{' '}
                                      {correction.changes.reason.from
                                        .substring(0, 30)
                                        .trim()}
                                      ... →{' '}
                                      {correction.changes.reason.to
                                        .substring(0, 30)
                                        .trim()}
                                      ...
                                    </div>
                                  )}
                                  {correction.changes.payment !== undefined && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.payment}:
                                      </span>{' '}
                                      {correction.changes.payment.from
                                        ? dict.detailsPage.yes
                                        : dict.detailsPage.no}{' '}
                                      →{' '}
                                      {correction.changes.payment.to
                                        ? dict.detailsPage.yes
                                        : dict.detailsPage.no}
                                    </div>
                                  )}
                                  {correction.changes.scheduledDayOff && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.scheduledDayOff}:
                                      </span>{' '}
                                      {correction.changes.scheduledDayOff.from
                                        ? formatDate(
                                            correction.changes.scheduledDayOff
                                              .from,
                                          )
                                        : dict.detailsPage.notSet}{' '}
                                      →{' '}
                                      {correction.changes.scheduledDayOff.to
                                        ? formatDate(
                                            correction.changes.scheduledDayOff
                                              .to,
                                          )
                                        : dict.detailsPage.notSet}
                                    </div>
                                  )}
                                  {correction.changes.workStartTime && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.workStartTime}:
                                      </span>{' '}
                                      {formatDateTime(
                                        correction.changes.workStartTime.from,
                                      )}{' '}
                                      →{' '}
                                      {formatDateTime(
                                        correction.changes.workStartTime.to,
                                      )}
                                    </div>
                                  )}
                                  {correction.changes.workEndTime && (
                                    <div>
                                      <span className='font-medium'>
                                        {dict.form.workEndTime}:
                                      </span>{' '}
                                      {formatDateTime(
                                        correction.changes.workEndTime.from,
                                      )}{' '}
                                      →{' '}
                                      {formatDateTime(
                                        correction.changes.workEndTime.to,
                                      )}
                                    </div>
                                  )}
                                  {Object.keys(correction.changes).length ===
                                    0 &&
                                    !correction.statusChanged && (
                                      <div className='text-muted-foreground'>
                                        {dict.detailsPage.noCorrections}
                                      </div>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
