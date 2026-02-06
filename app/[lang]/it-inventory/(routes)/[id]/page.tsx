import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDictionary } from '../../lib/dict';
import { getInventoryItem } from '../../lib/get-item';
import LocalizedLink from '@/components/localized-link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, UserPlus, UserMinus, Info, User, Clock, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Locale } from '@/lib/config/i18n';
import { extractNameFromEmail } from '@/lib/utils/name-format';

// Map IT inventory statuses to badge variants
function getStatusVariant(status: string): any {
  const statusMap: Record<string, string> = {
    'in-use': 'statusInUse',
    'in-stock': 'statusInStock',
    'damaged': 'statusDamaged',
    'to-dispose': 'statusToDispose',
    'disposed': 'statusDisposed',
    'to-review': 'statusToReview',
    'to-repair': 'statusToRepair',
  };

  return statusMap[status] || 'secondary';
}

export default async function ItemDetailsPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/it-inventory');
  }

  // Check roles for access
  const hasAdminRole = session.user.roles?.includes('admin');
  const hasManagerRole = session.user.roles?.includes('manager');
  const canView = hasAdminRole || hasManagerRole;
  const canManage = hasAdminRole;

  if (!canView) {
    redirect('/unauthorized');
  }

  const { lang, id } = await params;

  const result = await getInventoryItem(id);
  if (!result) {
    redirect(`/${lang}/it-inventory`);
  }

  const { item, itemWithFormattedDates } = result;
  const dict = await getDictionary(lang);

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
          <CardTitle className='mb-2 sm:mb-0'>
            <div className='flex flex-wrap gap-2'>
              {item.statuses.map((status) => (
                <Badge key={status} variant={getStatusVariant(status) as any} size='lg' className='text-lg'>
                  {dict.statuses[status]}
                </Badge>
              ))}
            </div>
          </CardTitle>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            {canManage && (
              <>
                {item.currentAssignment ? (
                  <LocalizedLink href={`/it-inventory/${id}/unassign`} className='w-full sm:w-auto'>
                    <Button variant='outline' className='w-full'>
                      <UserMinus /> {dict.common.unassign}
                    </Button>
                  </LocalizedLink>
                ) : (
                  <LocalizedLink href={`/it-inventory/${id}/assign`} className='w-full sm:w-auto'>
                    <Button variant='outline' className='w-full'>
                      <UserPlus /> {dict.common.assign}
                    </Button>
                  </LocalizedLink>
                )}
                <LocalizedLink href={`/it-inventory/${id}/edit`} className='w-full sm:w-auto'>
                  <Button variant='outline' className='w-full'>
                    <Edit /> {dict.common.edit}
                  </Button>
                </LocalizedLink>
              </>
            )}
            <LocalizedLink href='/it-inventory' className='w-full sm:w-auto'>
              <Button variant='outline' className='w-full'>
                <ArrowLeft />
                <span>{dict.common.back}</span>
              </Button>
            </LocalizedLink>
          </div>
        </div>
        <CardDescription>ID: {item.assetId}</CardDescription>
      </CardHeader>
      <Separator className='mb-4' />

      <CardContent>
        <div className='flex-col space-y-4'>
          <div className='space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4'>
            {/* Left Column - Basic Info & Audit */}
            <div className='flex-col space-y-4 lg:w-5/12'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <Info className='mr-2 h-5 w-5' /> {dict.details.basicInfo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.category}</TableCell>
                      <TableCell>{dict.categories[item.category]}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.manufacturer}</TableCell>
                      <TableCell>{item.manufacturer}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.model}</TableCell>
                      <TableCell>{item.model}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.serialNumber}</TableCell>
                      <TableCell>{item.serialNumber}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.purchaseDate}</TableCell>
                      <TableCell>{itemWithFormattedDates.purchaseDateFormatted}</TableCell>
                    </TableRow>

                    {item.lastReview && (
                      <TableRow>
                        <TableCell className='font-medium'>{dict.details.lastReview}</TableCell>
                        <TableCell>{itemWithFormattedDates.lastReviewFormatted}</TableCell>
                      </TableRow>
                    )}

                    {item.connectionType && (
                      <TableRow>
                        <TableCell className='font-medium'>{dict.details.connectionType}</TableCell>
                        <TableCell>{dict.connectionTypes[item.connectionType]}</TableCell>
                      </TableRow>
                    )}

                    {item.ipAddress && (
                      <TableRow>
                        <TableCell className='font-medium'>{dict.details.ipAddress}</TableCell>
                        <TableCell>{item.ipAddress}</TableCell>
                      </TableRow>
                    )}

                    {item.notes && (
                      <TableRow>
                        <TableCell className='font-medium'>{dict.details.notes}</TableCell>
                        <TableCell className='max-w-[200px] break-words'>{item.notes}</TableCell>
                      </TableRow>
                    )}

                    {item.department && (
                      <TableRow>
                        <TableCell className='font-medium'>{dict.details.department}</TableCell>
                        <TableCell>{item.department}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Audit Trail Card */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FileText className='mr-2 h-5 w-5' /> {dict.details.audit}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.createdAt}</TableCell>
                      <TableCell>{itemWithFormattedDates.createdAtFormatted}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.createdBy}</TableCell>
                      <TableCell>{extractNameFromEmail(item.createdBy)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.editedAt}</TableCell>
                      <TableCell>{itemWithFormattedDates.editedAtFormatted}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className='font-medium'>{dict.details.editedBy}</TableCell>
                      <TableCell>{extractNameFromEmail(item.editedBy)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>

            {/* Right Column - Assignment & History */}
            <div className='flex-col space-y-4 lg:w-7/12'>
              {/* Current Assignment Card */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <User className='mr-2 h-5 w-5' /> {dict.details.currentAssignment}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {item.currentAssignment ? (
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className='font-medium'>{dict.details.assignedTo}</TableCell>
                          <TableCell>
                            {item.currentAssignment.assignment.type === 'employee' ? (
                              <>
                                {item.currentAssignment.assignment.employee.firstName}{' '}
                                {item.currentAssignment.assignment.employee.lastName}{' '}
                                <span className='text-muted-foreground'>
                                  ({item.currentAssignment.assignment.employee.identifier})
                                </span>
                              </>
                            ) : (
                              item.currentAssignment.assignment.customName
                            )}
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell className='font-medium'>{dict.details.assignedAt}</TableCell>
                          <TableCell>{itemWithFormattedDates.currentAssignment?.assignedAtFormatted}</TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell className='font-medium'>{dict.details.assignedBy}</TableCell>
                          <TableCell>{extractNameFromEmail(item.currentAssignment.assignedBy)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground">{dict.details.unassigned}</div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment History Card */}
              {itemWithFormattedDates.assignmentHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center'>
                      <Clock className='mr-2 h-5 w-5' /> {dict.details.assignmentHistory}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{dict.details.assignedTo}</TableHead>
                          <TableHead>{dict.details.assigned}</TableHead>
                          <TableHead>{dict.details.unassignedOn}</TableHead>
                          <TableHead>{dict.details.reason}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemWithFormattedDates.assignmentHistory.map((record: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {record.assignment.type === 'employee' ? (
                                <>
                                  <div className='font-medium'>
                                    {record.assignment.employee.firstName} {record.assignment.employee.lastName}
                                  </div>
                                  <div className='text-sm text-muted-foreground'>
                                    ({record.assignment.employee.identifier})
                                  </div>
                                </>
                              ) : (
                                <div className='font-medium'>
                                  {record.assignment.customName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{record.assignedAtFormatted}</TableCell>
                            <TableCell>{record.unassignedAtFormatted || '-'}</TableCell>
                            <TableCell className='max-w-[150px] truncate'>{record.reason || '-'}</TableCell>
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
