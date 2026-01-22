'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { extractNameFromEmail } from '@/lib/utils/name-format';
import type { OvertimeSubmissionType } from '../lib/types';
import { toast } from 'sonner';

type OvertimeExportButtonProps = {
  submissions: OvertimeSubmissionType[];
  dict: {
    exportCsv: string;
    exporting: string;
    exportSuccess: string;
    exportError: string;
  };
  statusDict: {
    pending: string;
    approved: string;
    rejected: string;
    accounted: string;
    cancelled: string;
  };
  columnLabels: {
    employee: string;
    date: string;
    hours: string;
    status: string;
    supervisor: string;
    reason: string;
  };
};

export function OvertimeExportButton({
  submissions,
  dict,
  statusDict,
  columnLabels,
}: OvertimeExportButtonProps) {
  const exportToCsv = async () => {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Prepare CSV headers
    const headers = [
      columnLabels.employee,
      columnLabels.date,
      columnLabels.hours,
      columnLabels.status,
      columnLabels.supervisor,
      columnLabels.reason,
    ];

    // Prepare CSV rows
    const rows = submissions.map((submission) => [
      extractNameFromEmail(submission.submittedBy),
      new Date(submission.date).toLocaleDateString('pl-PL'),
      submission.hours.toString(),
      statusDict[submission.status as keyof typeof statusDict],
      extractNameFromEmail(submission.supervisor),
      submission.reason || '',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `overtime-summary-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return submissions.length;
  };

  const handleExport = () => {
    toast.promise(exportToCsv(), {
      loading: dict.exporting,
      success: (count) => dict.exportSuccess.replace('{count}', count.toString()),
      error: dict.exportError,
    });
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download />
      {dict.exportCsv}
    </Button>
  );
}
