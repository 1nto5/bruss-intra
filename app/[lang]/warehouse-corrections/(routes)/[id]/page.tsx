import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { extractNameFromEmail } from "@/lib/utils/name-format";
import { formatDateTime } from "@/lib/utils/date-format";
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
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>
                {correction.correctionNumber}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(correction.status)}>
                  {dict.status[correction.status]}
                </Badge>
                <Badge variant="outline">
                  {dict.types[correction.type]}
                </Badge>
              </div>
            </div>
            <CorrectionActions
              correction={correction}
              session={session}
              dict={dict}
              lang={lang}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.detail.createdBy}
              </p>
              <p className="font-medium">
                {extractNameFromEmail(correction.createdBy)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.detail.createdAt}
              </p>
              <p className="font-medium">
                {formatDateTime(new Date(correction.createdAt))}
              </p>
            </div>
            {correction.submittedAt && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.detail.submittedAt}
                </p>
                <p className="font-medium">
                  {formatDateTime(new Date(correction.submittedAt))}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.detail.totalValue}
              </p>
              <p className="text-lg font-bold">
                {correction.totalValue?.toFixed(2)} EUR
              </p>
            </div>
          </div>
          {correction.rejectionReason && (
            <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
                {dict.detail.rejectionReason}:
              </p>
              <p className="text-sm">{correction.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.detail.items}</CardTitle>
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
                  <TableHead>{dict.form.sourceWarehouse}</TableHead>
                  <TableHead>{dict.form.targetWarehouse}</TableHead>
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
                    <TableCell>{item.sourceWarehouse}</TableCell>
                    <TableCell>{item.targetWarehouse}</TableCell>
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
                  <TableCell colSpan={9} className="text-right font-bold">
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

      {/* Approvals */}
      {correction.approvals && correction.approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.detail.approvals}</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalStatusDisplay approvals={correction.approvals} dict={dict} />
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.detail.comments}</CardTitle>
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
          <CardTitle>{dict.detail.auditTrail}</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTrail auditLog={correction.auditLog || []} dict={dict} />
        </CardContent>
      </Card>
    </div>
  );
}
