import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  CheckCheck,
  Clock,
  LayoutList,
  MessageSquare,
  Package,
  Trash2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getDictionary } from "../../lib/dict";
import { fetchCorrection } from "../../lib/fetchers";
import type { CorrectionStatus } from "../../lib/types";
import ApprovalStatusDisplay from "../../components/detail/approval-status";
import CommentsSection from "../../components/detail/comments-section";
import AuditTrail from "../../components/detail/audit-trail";
import CorrectionActions from "../../components/detail/correction-actions";

function getStatusBadgeVariant(
  status: CorrectionStatus,
): "statusPending" | "statusApproved" | "statusRejected" | "statusClosed" | "outline" {
  switch (status) {
    case "draft":
      return "outline";
    case "submitted":
    case "in-approval":
      return "statusPending";
    case "approved":
      return "statusApproved";
    case "rejected":
      return "statusRejected";
    case "posted":
    case "cancelled":
      return "statusClosed";
    default:
      return "outline";
  }
}

export default async function CorrectionDetailPage(props: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const params = await props.params;
  const { lang, id } = params;
  const session = await auth();

  if (!session) {
    redirect(
      `/${lang}/auth?callbackUrl=/${lang}/warehouse-corrections/${id}`,
    );
  }

  const dict = await getDictionary(lang);
  const correction = await fetchCorrection(id);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="mb-2 flex items-center gap-2 lg:mb-0">
            <Badge
              variant={getStatusBadgeVariant(correction.status)}
              size="lg"
              className="text-lg"
            >
              {dict.status[correction.status]}
            </Badge>
            <Badge variant="outline" size="lg" className="text-lg">
              {dict.types[correction.type]}
            </Badge>
          </CardTitle>
          <CorrectionActions
            correction={correction}
            session={session}
            dict={dict}
            lang={lang}
          />
        </div>
        <CardDescription>
          {correction.correctionNumber}
        </CardDescription>
      </CardHeader>

      {correction.deletedAt && (
        <div className="px-6 pb-4">
          <Alert variant="destructive">
            <Trash2 className="h-4 w-4" />
            <AlertTitle>DELETED</AlertTitle>
            <AlertDescription>
              {extractNameFromEmail(correction.deletedBy || "")}
              {" - "}
              {formatDateTime(new Date(correction.deletedAt))}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Separator className="mb-4" />

      <CardContent>
        <div className="flex-col space-y-4">
          {/* Two-column layout */}
          <div className="space-y-4 lg:flex lg:justify-between lg:space-y-0 lg:space-x-4">
            {/* Left Column - Details */}
            <Card className="lg:w-5/12">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LayoutList className="mr-2 h-5 w-5" />
                  {dict.detail.details}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.detail.createdBy}
                      </TableCell>
                      <TableCell>
                        {extractNameFromEmail(correction.createdBy)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.detail.createdAt}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(new Date(correction.createdAt))}
                      </TableCell>
                    </TableRow>
                    {correction.submittedAt && (
                      <TableRow>
                        <TableCell className="font-medium">
                          {dict.detail.submittedAt}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(new Date(correction.submittedAt))}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.detail.type}
                      </TableCell>
                      <TableCell>
                        {dict.types[correction.type]}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.form.sourceWarehouse}
                      </TableCell>
                      <TableCell>
                        {correction.sourceWarehouse}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.form.targetWarehouse}
                      </TableCell>
                      <TableCell>
                        {correction.targetWarehouse}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.detail.totalValue}
                      </TableCell>
                      <TableCell className="text-lg font-bold">
                        {correction.totalValue?.toFixed(2)} EUR
                      </TableCell>
                    </TableRow>
                    {correction.rejectionReason && (
                      <TableRow className="bg-destructive/10">
                        <TableCell className="font-medium text-destructive">
                          {dict.detail.rejectionReason}
                        </TableCell>
                        <TableCell className="text-destructive">
                          {correction.rejectionReason}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right Column - Approvals, Comments, Audit Trail */}
            <div className="space-y-4 lg:w-7/12">
              {/* Approvals */}
              {correction.approvals && correction.approvals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCheck className="mr-2 h-5 w-5" />
                      {dict.detail.approvals}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ApprovalStatusDisplay
                      approvals={correction.approvals}
                      dict={dict}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    {dict.detail.comments}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentsSection
                    correctionId={id}
                    comments={correction.comments || []}
                    correctionStatus={correction.status}
                    dict={dict}
                    lang={lang}
                  />
                </CardContent>
              </Card>

              {/* Audit Trail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    {dict.detail.auditTrail}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditTrail
                    auditLog={correction.auditLog || []}
                    dict={dict}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Items Table - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                {dict.detail.items}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{dict.form.article}</TableHead>
                      <TableHead>{dict.form.articleName}</TableHead>
                      <TableHead>{dict.form.quarry}</TableHead>
                      <TableHead>{dict.form.batch}</TableHead>
                      <TableHead className="text-right">
                        {dict.form.quantity}
                      </TableHead>
                      <TableHead className="text-right">
                        {dict.form.unitPrice}
                      </TableHead>
                      <TableHead className="text-right">
                        {dict.form.value}
                      </TableHead>
                      <TableHead>{dict.form.reason}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {correction.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {item.articleNumber}
                        </TableCell>
                        <TableCell>{item.articleName}</TableCell>
                        <TableCell>{item.quarry || "-"}</TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unitPrice?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.value?.toFixed(2)}
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={7} className="text-right font-bold">
                        {dict.form.totalValue}:
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {correction.totalValue?.toFixed(2)} EUR
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
