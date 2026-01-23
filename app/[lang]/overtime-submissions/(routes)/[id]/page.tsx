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
import {
  formatDate,
  formatDateTime,
} from '@/lib/utils/date-format';
import { resolveDisplayNames } from '@/lib/utils/name-resolver';
import {
  Clock,
  Edit2,
  FileText,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { ObjectId } from 'mongodb';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CancelSubmissionButton from '../../components/cancel-submission-button';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const submission = await getOvertimeSubmission(id);

  if (!submission) {
    return {
      title: `${dict.detailsPage.title} (BRUSS)`,
    };
  }

  return {
    title: `${dict.detailsPage.title} - ${submission.internalId || id} (BRUSS)`,
  };
}

async function getOvertimeSubmission(id: string) {
  try {
    const coll = await dbc('overtime_submissions');
    const submission = await coll.findOne({ _id: new ObjectId(id) });
    return submission;
  } catch (error) {
    console.error('Error fetching overtime submission:', error);
    return null;
  }
}

export default async function OvertimeSubmissionDetailsPage(props: {
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
      `/${lang}/auth?callbackUrl=${encodeURIComponent(`/overtime-submissions/${id}`)}`,
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
    redirect(`/${lang}/overtime-submissions`);
  }

  const submission = await getOvertimeSubmission(id);

  if (!submission) {
    redirect(`/${lang}/overtime-submissions`);
  }

  // Collect all emails that need name resolution
  const emailsToResolve: { email: string; identifier?: string }[] = [
    { email: submission.submittedBy, identifier: submission.submittedByIdentifier },
    { email: submission.supervisor },
  ];
  if (submission.createdBy) emailsToResolve.push({ email: submission.createdBy });
  if (submission.cancelledBy) emailsToResolve.push({ email: submission.cancelledBy });
  if (submission.accountedBy) emailsToResolve.push({ email: submission.accountedBy });
  if (submission.approvedBy) emailsToResolve.push({ email: submission.approvedBy });
  if (submission.rejectedBy) emailsToResolve.push({ email: submission.rejectedBy });
  if (submission.editedBy) emailsToResolve.push({ email: submission.editedBy });
  // Add emails from correction history
  if (submission.correctionHistory) {
    for (const correction of submission.correctionHistory) {
      emailsToResolve.push({ email: correction.correctedBy });
      if (correction.changes?.supervisor?.from) {
        emailsToResolve.push({ email: correction.changes.supervisor.from });
      }
      if (correction.changes?.supervisor?.to) {
        emailsToResolve.push({ email: correction.changes.supervisor.to });
      }
    }
  }

  const resolvedNames = await resolveDisplayNames(emailsToResolve);
  const getName = (email: string, identifier?: string) =>
    resolvedNames.get(identifier || email) || email;

  // Use returnUrl from searchParams if available, otherwise default to list
  const backUrl = searchParams.returnUrl
    ? decodeURIComponent(searchParams.returnUrl)
    : '/overtime-submissions';

  // Check if user can correct this submission
  const userEmail = session.user.email ?? '';
  const userRoles = session.user.roles ?? [];
  const isAuthor = submission.submittedBy === userEmail;
  const isHR = userRoles.includes('hr');
  const isAdmin = userRoles.includes('admin');

  // Correction permissions:
  // - Author: only when status is pending
  // - HR: when status is pending or approved
  // - Admin: all statuses except accounted
  const canCorrect =
    (isAuthor && submission.status === 'pending') ||
    (isHR && ['pending', 'approved'].includes(submission.status)) ||
    (isAdmin && submission.status !== 'accounted');

  // Can cancel when status is pending
  const canCancel = submission.status === 'pending';

  // Build correction URL with returnUrl for back navigation chain
  const correctionReturnUrl = searchParams.returnUrl
    ? `&returnUrl=${searchParams.returnUrl}`
    : '';
  const correctionUrl = `/overtime-submissions/correct-overtime/${id}?from=details${correctionReturnUrl}`;

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='mb-2 sm:mb-0'>
            {getStatusBadge(submission.status, dict)}
          </CardTitle>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {/* Cancel submission button */}
            {canCancel && (
              <CancelSubmissionButton submissionId={id} dict={dict} />
            )}
            {/* Admin actions (Approve, Reject, Mark Accounted) */}
            <DetailActions
              submissionId={id}
              status={submission.status}
              supervisor={submission.supervisor}
              session={session}
              dict={dict}
            />
            {/* Correction button */}
            {canCorrect && (
              <LocalizedLink href={correctionUrl} className='w-full sm:w-auto'>
                <Button variant='outline' className='w-full'>
                  <Edit2 /> {dict.actions.correct}
                </Button>
              </LocalizedLink>
            )}
            {/* Back to submissions button */}
            <LocalizedLink href={backUrl} className='w-full sm:w-auto'>
              <Button variant='outline' className='w-full'>
                <TableIcon /> {dict.detailsPage.backToSubmissions}
              </Button>
            </LocalizedLink>
          </div>
        </div>
        {submission.internalId && (
          <CardDescription>ID: {submission.internalId}</CardDescription>
        )}
      </CardHeader>
      <Separator className='mb-4' />

      <CardContent>
        <div className='flex-col space-y-4'>
          <div className='space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4'>
            {/* Left Column - Submission Details */}
            <Card className='lg:w-5/12'>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FileText className='mr-2 h-5 w-5' />{' '}
                  {dict.detailsPage.submissionDetails}
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
                        {getName(submission.submittedBy, submission.submittedByIdentifier)}
                      </TableCell>
                    </TableRow>

                    {/* Show createdBy when submission was created on behalf of someone */}
                    {submission.createdBy &&
                      submission.createdBy !== submission.submittedBy && (
                        <TableRow>
                          <TableCell className='font-medium'>
                            {dict.form.createdBy}
                          </TableCell>
                          <TableCell>
                            {getName(submission.createdBy)}
                          </TableCell>
                        </TableRow>
                      )}

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.supervisor}
                      </TableCell>
                      <TableCell>
                        {getName(submission.supervisor)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.date}
                      </TableCell>
                      <TableCell>{formatDate(submission.date)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>
                        {dict.detailsPage.hours}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            submission.hours < 0
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {submission.hours}h
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Show reason if it exists */}
                    {submission.reason && (
                      <TableRow>
                        <TableCell className='align-top font-medium'>
                          {dict.detailsPage.reason}
                        </TableCell>
                        <TableCell className='whitespace-pre-wrap'>
                          {submission.reason}
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
                      {submission.cancelledAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusCancelled'>
                              {dict.detailsPage.statusLabels.cancelled}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getName(submission.cancelledBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(submission.cancelledAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Accounted */}
                      {submission.accountedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusAccounted'>
                              {dict.detailsPage.statusLabels.accounted}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getName(submission.accountedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(submission.accountedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Approved */}
                      {submission.approvedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusApproved'>
                              {dict.detailsPage.statusLabels.approved}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getName(submission.approvedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(submission.approvedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Rejected */}
                      {submission.rejectedAt && (
                        <TableRow>
                          <TableCell>
                            <Badge variant='statusRejected'>
                              {dict.detailsPage.statusLabels.rejected}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getName(submission.rejectedBy || '')}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(submission.rejectedAt)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Edited */}
                      {submission.editedAt &&
                        submission.editedAt.getTime() !==
                          submission.submittedAt.getTime() && (
                          <TableRow>
                            <TableCell>
                              <Badge variant='outline'>
                                {dict.detailsPage.statusLabels.edited}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getName(submission.editedBy || '')}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(submission.editedAt)}
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
                          {getName(submission.submittedBy, submission.submittedByIdentifier)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(submission.submittedAt)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Rejection Details Card */}
              {submission.rejectionReason && (
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
                            {submission.rejectionReason}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Corrections History Card */}
              {submission.correctionHistory &&
                submission.correctionHistory.length > 0 && (
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
                          {[...submission.correctionHistory]
                            .reverse()
                            .map((correction: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className='whitespace-nowrap'>
                                  {formatDateTime(correction.correctedAt)}
                                </TableCell>
                                <TableCell className='whitespace-nowrap'>
                                  {getName(correction.correctedBy)}
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
                                        {getName(
                                          correction.changes.supervisor.from,
                                        )}{' '}
                                        →{' '}
                                        {getName(
                                          correction.changes.supervisor.to,
                                        )}
                                      </div>
                                    )}
                                    {correction.changes.date && (
                                      <div>
                                        <span className='font-medium'>
                                          {dict.form.date}:
                                        </span>{' '}
                                        {formatDate(
                                          correction.changes.date.from,
                                        )}{' '}
                                        →{' '}
                                        {formatDate(correction.changes.date.to)}
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
