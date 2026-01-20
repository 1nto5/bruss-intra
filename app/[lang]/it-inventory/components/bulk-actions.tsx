'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dictionary } from '../lib/dict';
import { ITInventoryItem, EQUIPMENT_STATUSES } from '../lib/types';
import { deleteItem } from '../actions/crud';
import { bulkUpdateStatuses } from '../actions/assignment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BulkActions({
  selectedItems,
  dict,
}: {
  selectedItems: ITInventoryItem[];
  dict: Dictionary;
}) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkStatusUpdate = async () => {
    if (selectedStatuses.length === 0) {
      toast.error(dict.bulk.selectStatus);
      return;
    }

    setIsProcessing(true);
    toast.loading(dict.bulk.updating);

    try {
      const itemIds = selectedItems.map((item) => item._id);
      const result = await bulkUpdateStatuses(itemIds, selectedStatuses, []);

      if ('error' in result) {
        toast.dismiss();
        toast.error(result.error);
        setIsProcessing(false);
        return;
      }

      toast.dismiss();
      toast.success(dict.bulk.updated);
      setIsStatusDialogOpen(false);
      setSelectedStatuses([]);

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(dict.toast.error);
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    toast.loading(dict.bulk.deleting);

    try {
      let errorCount = 0;

      for (const item of selectedItems) {
        const result = await deleteItem(item._id);
        if ('error' in result) {
          errorCount++;
        }
      }

      toast.dismiss();

      if (errorCount === 0) {
        toast.success(dict.bulk.deleted);
      } else if (errorCount === selectedItems.length) {
        toast.error(dict.bulk.deleteFailed);
      } else {
        toast.warning(
          `${dict.bulk.partialDelete} (${selectedItems.length - errorCount}/${selectedItems.length})`,
        );
      }

      setIsDeleteDialogOpen(false);

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(dict.toast.error);
      setIsProcessing(false);
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 p-4 bg-muted rounded-lg">
        <span className="text-sm font-medium">
          {selectedItems.length} {dict.bulk.selected}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {dict.bulk.actions}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setIsStatusDialogOpen(true)}>
              <Edit />
              {dict.bulk.updateStatuses}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 />
              {dict.bulk.deleteItems}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.bulk.updateStatusesTitle}</DialogTitle>
            <DialogDescription>
              {dict.bulk.updateStatusesDescription.replace(
                '{count}',
                selectedItems.length.toString(),
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {dict.filters.status}
              </label>
              <MultiSelect
                options={EQUIPMENT_STATUSES.map((status) => ({
                  value: status,
                  label: dict.statuses[status],
                }))}
                value={selectedStatuses}
                onValueChange={setSelectedStatuses}
                placeholder={dict.common.select}
                emptyText={dict.table.noResults}
                clearLabel={dict.common.clear}
                selectedLabel={dict.bulk.selected}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isProcessing}
            >
              {dict.common.cancel}
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={isProcessing}>
              {dict.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.bulk.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.bulk.deleteDescription.replace(
                '{count}',
                selectedItems.length.toString(),
              )}
              <div className="mt-2 p-2 bg-muted rounded text-sm font-medium">
                {selectedItems.slice(0, 5).map((item) => (
                  <div key={item._id}>
                    {item.assetId} - {item.manufacturer} {item.model}
                  </div>
                ))}
                {selectedItems.length > 5 && (
                  <div className="text-muted-foreground">
                    +{selectedItems.length - 5} {dict.bulk.more}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {dict.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dict.bulk.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
