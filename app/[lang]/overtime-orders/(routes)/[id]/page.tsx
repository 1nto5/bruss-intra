import { auth } from '@/lib/auth';
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
import { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import { formatDate, formatDateTime } from '@/lib/utils/date-format';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  Clock,
  Download,
  Edit,
  LayoutList,
  Package,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import LocalizedLink from '@/components/localized-link';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../lib/dict';
import { getOvertimeRequest } from '../../lib/get-overtime-request';
import { getDepartmentDisplayName } from '../../lib/types';
import DetailPageActions from '../../components/detail-page-actions';
import type { Dictionary } from '../../lib/dict';

function getStatusBadge(
  status: string,
  department: string | undefined,
  dict: Dictionary,
) {
  switch (status) {
    case 'pending':
      if (department === 'logistics') {
        return (
          <Badge variant='statusPreApproved' size='lg' className='text-lg'>
            {dict.detailsPage.statusLabels.pendingPlantManager}
          </Badge>
        );
      }
      return (
        <Badge variant='statusPending' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.pendingProductionManager}
        </Badge>
      );
    case 'pre_approved':
      return (
        <Badge variant='statusPreApproved' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.pre_approved}
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant='statusApproved' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.approved}
        </Badge>
      );
    case 'canceled':
      return (
        <Badge variant='statusRejected' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.canceled}
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant='statusClosed' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.completed}
        </Badge>
      );
    case 'accounted':
      return (
        <Badge variant='statusAccounted' size='lg' className='text-lg'>
          {dict.detailsPage.statusLabels.accounted}
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

function calculateTotalHours(
  from: Date,
  to: Date,
  numberOfEmployees: number,
  numberOfShifts: number,
): string {
  const hoursPerEmployee = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
  const totalHours = (hoursPerEmployee * numberOfEmployees) / numberOfShifts;
  return `${Math.round(totalHours * 100) / 100}h`;
}

function formatDuration(from: Date, to: Date): string {
  const durationMs = to.getTime() - from.getTime();
  const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
  return `${hours}h`;
}

export default async function OvertimeDetailsPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;

  const dict = await getDictionary(lang);

  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }

  let overtimeRequestLocaleString;
  try {
    ({ overtimeRequestLocaleString } = await getOvertimeRequest(lang, id));
  } catch (error) {
    console.error('Error fetching overtime request:', error);
    redirect(`/overtime-orders`);
  }

  const request = overtimeRequestLocaleString;

  // Permission checks for link-based actions
  const userRoles = session.user?.roles || [];
  const userEmail = session.user?.email;
  const isAdmin = userRoles.includes('admin');

  const canEdit =
    request.status === 'canceled' || request.status === 'accounted'
      ? isAdmin
      : (request.requestedBy === userEmail &&
          request.status === 'pending') ||
        isAdmin ||
        userRoles.includes('hr') ||
        userRoles.includes('plant-manager');

  const canComplete =
    request.status === 'approved' &&
    (userRoles.some((role: string) =>
      [
        'group-leader',
        'production-manager',
        'plant-manager',
        'hr',
        'admin',
      ].includes(role),
    ) ||
      userEmail === request.requestedBy ||
      userEmail === request.responsibleEmployee);

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <CardTitle className='mb-2 lg:mb-0'>
            {getStatusBadge(request.status, request.department, dict)}
          </CardTitle>
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:flex'>
            {/* Management actions */}
            <DetailPageActions
              requestId={request._id}
              status={request.status}
              department={request.department}
              requestedBy={request.requestedBy}
              responsibleEmployee={request.responsibleEmployee}
              session={session}
              dict={dict}
              editSlot={
                canEdit ? (
                  <LocalizedLink href={`/overtime-orders/${id}/edit`}>
                    <Button variant='outline' className='w-full'>
                      <Edit /> {dict.tableColumns.editRequest}
                    </Button>
                  </LocalizedLink>
                ) : undefined
              }
              completeSlot={
                canComplete ? (
                  <LocalizedLink href={`/overtime-orders/${id}/complete`}>
                    <Button variant='outline' className='w-full'>
                      <CheckCircle /> {dict.tableColumnsExtra.closeOrder}
                    </Button>
                  </LocalizedLink>
                ) : undefined
              }
            />

            {/* Download attachment button */}
            {request.hasAttachment && (
              <Link
                href={`/api/overtime-orders/download?overTimeRequestId=${request._id}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Button variant='outline' className='w-full'>
                  <Download /> {dict.detailsPage.attendanceList}
                </Button>
              </Link>
            )}

            {/* Manage employees button */}
            <LocalizedLink href={`/overtime-orders/${id}/pickups`}>
              <Button variant='outline' className='w-full'>
                <Users /> {dict.detailsPage.overtimePickup}
              </Button>
            </LocalizedLink>

            {/* Back to orders button */}
            <LocalizedLink href='/overtime-orders'>
              <Button variant='outline' className='w-full'>
                <ArrowLeft />
                <span>{dict.detailsPage.backToOrders}</span>
              </Button>
            </LocalizedLink>
          </div>
        </div>
        <CardDescription>ID: {request.internalId}</CardDescription>
      </CardHeader>
      <Separator className='mb-4' />

      <CardContent>
        <div className='flex-col space-y-4'>
          <div className='space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4'>
            {/* Left Column - Details */}
            <Card className='lg:w-5/12'>
              <CardHeader>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
                  <CardTitle className='mb-2 flex items-center sm:mb-0'>
                    <LayoutList className='mr-2 h-5 w-5' /> {dict.detailsPage.orderDetails}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className='font-medium'>{dict.detailsPage.created}</TableCell>
                      <TableCell>
                        {formatDateTime(request.requestedAt)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.requestedBy}
                      </TableCell>
                      <TableCell>
                        {extractNameFromEmail(request.requestedBy)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.responsiblePerson}
                      </TableCell>
                      <TableCell>
                        {extractNameFromEmail(request.responsibleEmployee)}
                      </TableCell>
                    </TableRow>

                    {request.department && (
                      <TableRow>
                        <TableCell className='font-medium'>
                          {dict.detailsPage.department}
                        </TableCell>
                        <TableCell>
                          {getDepartmentDisplayName(request.department)}
                          {request.quarry && ` (${request.quarry})`}
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.startTime}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(request.from)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.endTime}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(request.to)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.duration}
                      </TableCell>
                      <TableCell>
                        {formatDuration(
                          new Date(request.from),
                          new Date(request.to),
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.numberOfShifts}
                      </TableCell>
                      <TableCell>{request.numberOfShifts || 1}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.plannedEmployees}
                      </TableCell>
                      <TableCell>{request.numberOfEmployees}</TableCell>
                    </TableRow>

                    {request.actualEmployeesWorked !== undefined && (
                      <TableRow>
                        <TableCell className='font-medium'>
                          {dict.detailsPage.actualEmployees}
                        </TableCell>
                        <TableCell>{request.actualEmployeesWorked}</TableCell>
                      </TableRow>
                    )}

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.employeesPickingUpDaysOff}
                      </TableCell>
                      <TableCell>
                        {request.employeesWithScheduledDayOff?.length || 0}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.totalHours}
                      </TableCell>
                      <TableCell>
                        {calculateTotalHours(
                          new Date(request.from),
                          new Date(request.to),
                          request.numberOfEmployees,
                          request.numberOfShifts || 1,
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.reason}
                      </TableCell>
                      <TableCell className='max-w-[200px] break-words'>
                        {request.reason}
                      </TableCell>
                    </TableRow>

                    {request.note && (
                      <TableRow>
                        <TableCell className='font-medium'>
                          {dict.detailsPage.additionalInfo}
                        </TableCell>
                        <TableCell className='max-w-[200px] break-words'>
                          {request.note}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right Column - Multiple Cards */}
            <div className='flex-col space-y-4 lg:w-7/12'>
              {/* Production Information Card */}
              {((request.plannedArticles &&
                request.plannedArticles.length > 0) ||
                (request.actualArticles &&
                  request.actualArticles.length > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center'>
                      <Package className='mr-2 h-5 w-5' /> {dict.detailsPage.productionInfo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-6'>
                      {/* Planned Articles */}
                      {request.plannedArticles &&
                        request.plannedArticles.length > 0 && (
                          <div>
                            <h4 className='mb-3 text-lg font-medium'>
                              {dict.detailsPage.plannedProduction}
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{dict.detailsPage.article}</TableHead>
                                  <TableHead className='text-right'>
                                    {dict.detailsPage.quantity}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {request.plannedArticles.map(
                                  (article, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        {article.articleNumber}
                                      </TableCell>
                                      <TableCell className='text-right'>
                                        {article.quantity} {dict.detailsPage.pcs}
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                      {/* Actual Articles */}
                      {request.actualArticles &&
                        request.actualArticles.length > 0 && (
                          <div>
                            <h4 className='mb-3 text-lg font-medium'>
                              {dict.detailsPage.actualProduction}
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{dict.detailsPage.article}</TableHead>
                                  <TableHead className='text-right'>
                                    {dict.detailsPage.quantity}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {request.actualArticles.map(
                                  (article, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        {article.articleNumber}
                                      </TableCell>
                                      <TableCell className='text-right'>
                                        {article.quantity} {dict.detailsPage.pcs}
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employees with Day Off Card */}
              {request.employeesWithScheduledDayOff &&
                request.employeesWithScheduledDayOff.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className='flex justify-between'>
                        <CardTitle className='flex items-center'>
                          <CalendarClock className='mr-2 h-5 w-5' /> {dict.detailsPage.employeesWithDayOff}
                        </CardTitle>
                        <LocalizedLink
                          href={`/overtime-orders/${id}/pickups`}
                          className='w-full sm:w-auto'
                        >
                          <Button variant='outline' className='w-full'>
                            <Users /> {dict.detailsPage.manage}
                          </Button>
                        </LocalizedLink>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{dict.detailsPage.employee}</TableHead>
                            <TableHead>{dict.detailsPage.persNo}</TableHead>
                            <TableHead>{dict.detailsPage.pickupDate}</TableHead>
                            <TableHead>{dict.detailsPage.notes}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.employeesWithScheduledDayOff.map(
                            (employee, index) => (
                              <TableRow key={index}>
                                <TableCell className='font-medium'>
                                  {employee.firstName} {employee.lastName}
                                </TableCell>
                                <TableCell>{employee.identifier}</TableCell>
                                <TableCell>
                                  {employee.agreedReceivingAt
                                    ? formatDate(employee.agreedReceivingAt)
                                    : dict.detailsPage.notSet}
                                </TableCell>
                                <TableCell className='max-w-[150px] truncate'>
                                  {employee.note || '-'}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

              {/* Status History Card */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <Clock className='mr-2 h-5 w-5' /> {dict.detailsPage.history}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.detailsPage.status}</TableHead>
                        <TableHead>{dict.detailsPage.person}</TableHead>
                        <TableHead>{dict.detailsPage.date}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Canceled */}
                      {request.canceledAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusRejected'>{dict.detailsPage.statusLabels.canceled}</Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.canceledBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.canceledAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Accounted */}
                      {request.accountedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusAccounted'>{dict.detailsPage.statusLabels.accounted}</Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.accountedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.accountedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Completed */}
                      {request.completedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusClosed'>{dict.detailsPage.statusLabels.completed}</Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.completedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.completedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Approved */}
                      {request.approvedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusApproved'>{dict.detailsPage.statusLabels.approved}</Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.approvedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.approvedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Pre-approved */}
                      {request.preApprovedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusPreApproved'>{dict.detailsPage.statusLabels.pre_approved}</Badge>
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.preApprovedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.preApprovedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Pending */}
                      {request.pendingAt && (
                        <TableRow>
                          <TableCell>
                            {request.department === 'logistics' ? (
                              <Badge variant='statusPreApproved'>
                                {dict.detailsPage.statusLabels.pendingPlantManager}
                              </Badge>
                            ) : (
                              <Badge variant='statusPending'>
                                {dict.detailsPage.statusLabels.pendingProductionManager}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {extractNameFromEmail(request.pendingBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(request.pendingAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Created */}
                      <TableRow>
                        <TableCell>
                          <Badge variant='outline'>{dict.detailsPage.statusLabels.created}</Badge>
                        </TableCell>
                        <TableCell>
                          {extractNameFromEmail(request.requestedBy)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(request.requestedAt)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
