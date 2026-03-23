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
  ListTree,
  MessageSquare,
  Package,
  Trash2,
  X,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getDictionary } from "../../lib/dict";
import { fetchCorrection, fetchReasons } from "../../lib/fetchers";
import { getApprovalRolesForUser } from "../../lib/permissions";
import type { AuditLogEntry, CorrectionStatus } from "../../lib/types";
import AddCommentDialog from "../../components/detail/add-comment-dialog";
import ApprovalStatusDisplay from "../../components/detail/approval-status";
import AuditTrail from "../../components/detail/audit-trail";
import CommentsSection from "../../components/detail/comments-section";
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

const STATUS_ACTIONS = new Set([
  "created",
  "submitted",
  "resubmitted",
  "approved",
  "rejected",
  "posted",
  "cancelled",
  "deleted",
  "reactivated",
]);

function getAuditBadgeVariant(action: AuditLogEntry["action"]) {
  switch (action) {
    case "created":
    case "reactivated":
      return "outline" as const;
    case "submitted":
    case "resubmitted":
      return "statusPending" as const;
    case "approved":
      return "statusApproved" as const;
    case "rejected":
      return "statusRejected" as const;
    case "posted":
    case "cancelled":
      return "statusClosed" as const;
    case "deleted":
      return "destructive" as const;
    default:
      return "outline" as const;
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
  const [correction, reasons] = await Promise.all([
    fetchCorrection(id),
    fetchReasons(),
  ]);
  const userApprovalRoles = getApprovalRolesForUser(
    session?.user?.roles || [],
  );

  const reasonValue =
    correction.reason ||
    ((correction.items?.[0] as Record<string, unknown>)?.reason as string) ||
    "";
  const translatedReason = reasons.find((r) => r.value === reasonValue);
  const reasonLabel = translatedReason
    ? lang === "pl"
      ? translatedReason.pl
      : lang === "de"
        ? translatedReason.de
        : translatedReason.label
    : reasonValue;

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
                        {dict.form.reason}
                      </TableCell>
                      <TableCell>{reasonLabel}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {dict.detail.totalValue}
                      </TableCell>
                      <TableCell className="text-lg font-bold">
                        {correction.totalValue?.toFixed(2)} EUR
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right Column - Status History, Rejection, Approvals */}
            <div className="space-y-4 lg:w-7/12">
              {/* Status History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    {dict.detail.auditTrail}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {correction.auditLog && correction.auditLog.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{dict.detail.status}</TableHead>
                          <TableHead>{dict.detail.person}</TableHead>
                          <TableHead>{dict.detail.dateTime}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...correction.auditLog]
                          .filter((entry) => STATUS_ACTIONS.has(entry.action))
                          .reverse()
                          .map((entry) => (
                            <TableRow key={entry._id?.toString()}>
                              <TableCell>
                                <Badge variant={getAuditBadgeVariant(entry.action)}>
                                  {dict.auditActions[
                                    entry.action as keyof typeof dict.auditActions
                                  ] || entry.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {extractNameFromEmail(entry.performedBy)}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(new Date(entry.performedAt))}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {dict.detail.noAuditLog}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Rejection Details */}
              {correction.rejectionReason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                      <X className="mr-2 h-5 w-5" />
                      {dict.detail.rejectionDetails}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {dict.detail.rejectionReason}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="max-w-[400px] text-justify break-words">
                            {correction.rejectionReason}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

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
                      correctionId={id}
                      correctionStatus={correction.status}
                      userApprovalRoles={userApprovalRoles}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Items Table */}
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
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  {dict.detail.comments}
                </CardTitle>
                {correction.status !== "cancelled" && (
                  <AddCommentDialog
                    correctionId={id}
                    dict={dict}
                    lang={lang}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CommentsSection
                comments={correction.comments || []}
                dict={dict}
              />
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListTree className="mr-2 h-5 w-5" />
                {dict.detail.auditLog}
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
      </CardContent>
    </Card>
  );
}
