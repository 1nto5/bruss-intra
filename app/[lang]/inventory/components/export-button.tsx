'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { exportInventoryPositionsToExcel } from '../actions';

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportInventoryPositionsToExcel();

      if (result.error) {
        console.error('Export failed:', result.error);
        return;
      }

      if (result.success && result.data) {
        // Convert base64 to blob and download
        const buffer = Buffer.from(result.data, 'base64');
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'inventory_positions.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant='outline'
      className='w-full sm:w-auto'
    >
      <Download />
      Export
    </Button>
  );
}
